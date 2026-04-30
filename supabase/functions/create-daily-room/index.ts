import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateRoomRequest {
    bookingId: string;
    scheduledAt: string;
    durationMinutes: number;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    try {
        if (!DAILY_API_KEY) {
            throw new Error("Daily.co API key not configured");
        }

        const { bookingId, scheduledAt, durationMinutes }: CreateRoomRequest = await req.json();

        // Calculate room expiry (scheduled time + duration + 2 hour buffer)
        const scheduledDate = new Date(scheduledAt);
        const expiryTime = new Date(scheduledDate.getTime() + (durationMinutes + 120) * 60 * 1000);

        // Use short room name (Daily limits to ~40 chars)
        const shortId = bookingId.replace(/-/g, "").substring(0, 16);
        const roomName = `iv-${shortId}`;

        // Create Daily.co room — PUBLIC so both participants can join freely
        const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DAILY_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: roomName,
                privacy: "public",
                properties: {
                    exp: Math.floor(expiryTime.getTime() / 1000),
                    enable_chat: true,
                    enable_screenshare: true,
                    start_video_off: false,
                    start_audio_off: false,
                    max_participants: 4,
                    enable_knocking: false,
                    enable_prejoin_ui: true,
                },
            }),
        });

        const room = await roomResponse.json();

        if (room.error) {
            throw new Error(room.error.description || room.error.message || JSON.stringify(room.error));
        }

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
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Create room error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    }
});
