import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        const { bookingId, scheduledAt, durationMinutes }: CreateRoomRequest = await req.json();

        // Generate a deterministic Jitsi Meet room name from the booking ID
        const shortId = bookingId.replace(/-/g, "").substring(0, 16);
        const roomName = `InterviewAce-${shortId}`;
        const roomUrl = `https://meet.jit.si/${roomName}`;

        // Update booking with meeting link
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { error: updateError } = await supabase
            .from("bookings")
            .update({
                meeting_link: roomUrl,
                meeting_room_id: roomName,
            })
            .eq("id", bookingId);

        if (updateError) {
            console.error("Error updating booking:", updateError);
        }

        return new Response(
            JSON.stringify({
                roomUrl,
                roomName,
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
