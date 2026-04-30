import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify Razorpay signature
function verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string
): boolean {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
    return expectedSignature === signature;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (!RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay secret not configured");
        }

        const payload = await req.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            booking_id,
        } = payload;

        // Verify signature
        const isValid = verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            RAZORPAY_KEY_SECRET
        );

        if (!isValid) {
            throw new Error("Invalid payment signature");
        }

        // Initialize Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get booking details
        const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .select("*, interviewer_amount_cents")
            .eq("id", booking_id)
            .single();

        if (bookingError || !booking) {
            throw new Error("Booking not found");
        }

        // Update booking status
        const { error: updateError } = await supabase
            .from("bookings")
            .update({
                payment_status: "completed",
                razorpay_payment_id: razorpay_payment_id,
            })
            .eq("id", booking_id);

        if (updateError) {
            console.error("Error updating booking:", updateError);
        }

        // Credit interviewer wallet
        const { data: wallet } = await supabase
            .from("wallets")
            .select("*")
            .eq("user_id", booking.interviewer_id)
            .single();

        if (wallet) {
            const interviewerAmount = booking.interviewer_amount_cents || 0;

            // Add to pending (interviewer gets paid after interview completes)
            await supabase
                .from("wallets")
                .update({
                    pending_cents: (wallet.pending_cents || 0) + interviewerAmount,
                })
                .eq("id", wallet.id);

            // Create transaction record
            await supabase.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                type: "credit",
                amount_cents: interviewerAmount,
                balance_after_cents: wallet.balance_cents,
                description: `Interview booking payment`,
                booking_id: booking_id,
            });
        }

        console.log(`Payment verified for booking ${booking_id}`);

        return new Response(
            JSON.stringify({ success: true, bookingId: booking_id }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Payment verification error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
