import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
    bookingId: string;
    interviewerId: string;
    amountCents: number;
    interviewType: string;
    scheduledAt: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (!STRIPE_SECRET_KEY) {
            throw new Error("Stripe secret key not configured");
        }

        const { bookingId, interviewerId, amountCents, interviewType, scheduledAt }: CheckoutRequest = await req.json();

        // Calculate platform fee (15%)
        const platformFee = Math.round(amountCents * 0.15);

        // Create Stripe Checkout Session
        const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                "mode": "payment",
                "payment_method_types[0]": "card",
                "line_items[0][price_data][currency]": "usd",
                "line_items[0][price_data][unit_amount]": amountCents.toString(),
                "line_items[0][price_data][product_data][name]": `${interviewType} Interview Session`,
                "line_items[0][price_data][product_data][description]": `Scheduled for ${new Date(scheduledAt).toLocaleDateString()}`,
                "line_items[0][quantity]": "1",
                "success_url": `${FRONTEND_URL}/app/student?payment=success&booking=${bookingId}`,
                "cancel_url": `${FRONTEND_URL}/app/student?payment=cancelled&booking=${bookingId}`,
                "metadata[booking_id]": bookingId,
                "metadata[interviewer_id]": interviewerId,
                "metadata[platform_fee]": platformFee.toString(),
            }),
        });

        const session = await response.json();

        if (session.error) {
            throw new Error(session.error.message);
        }

        return new Response(
            JSON.stringify({
                checkoutUrl: session.url,
                sessionId: session.id,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Checkout error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
