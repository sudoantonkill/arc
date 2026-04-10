import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateRoomRequest {
    bookingId: string;
    scheduledAt: string;
    durationMinutes: number;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (!DAILY_API_KEY) {
            throw new Error("Daily.co API key not configured");
        }

        const { bookingId, scheduledAt, durationMinutes }: CreateRoomRequest = await req.json();

        // Calculate room expiry (scheduled time + duration + 1 hour buffer)
        const scheduledDate = new Date(scheduledAt);
        const expiryTime = new Date(scheduledDate.getTime() + (durationMinutes + 60) * 60 * 1000);

        // Create Daily.co room
        const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DAILY_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: `interview-${bookingId}`,
                privacy: "private",
                properties: {
                    // Room expires after the interview
                    exp: Math.floor(expiryTime.getTime() / 1000),
                    // Enable recording (optional)
                    enable_recording: "cloud",
                    // Enable chat
                    enable_chat: true,
                    // Enable screenshare
                    enable_screenshare: true,
                    // Start with video on
                    start_video_off: false,
                    // Start with audio on
                    start_audio_off: false,
                    // Max participants (interviewer + student)
                    max_participants: 2,
                    // Enable knocking for waiting room
                    enable_knocking: true,
                    // Allowed to join before host
                    enable_prejoin_ui: true,
                },
            }),
        });

        const room = await roomResponse.json();

        if (room.error) {
            throw new Error(room.error.message || "Failed to create Daily.co room");
        }

        // Create meeting tokens for participants (optional but recommended for private rooms)
        const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DAILY_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                properties: {
                    room_name: room.name,
                    exp: Math.floor(expiryTime.getTime() / 1000),
                    is_owner: false,
                },
            }),
        });

        const token = await tokenResponse.json();

        // Update booking with meeting link
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { error: updateError } = await supabase
            .from("bookings")
            .update({
                meeting_link: room.url,
                meeting_room_id: room.name,
            })
            .eq("id", bookingId);

        if (updateError) {
            console.error("Error updating booking:", updateError);
        }

        return new Response(
            JSON.stringify({
                roomUrl: room.url,
                roomName: room.name,
                token: token.token,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Create room error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
