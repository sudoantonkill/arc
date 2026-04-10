import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Stripe signature verification
async function verifyStripeSignature(
    payload: string,
    signature: string,
    secret: string
): Promise<boolean> {
    const encoder = new TextEncoder();
    const parts = signature.split(",").reduce((acc, part) => {
        const [key, value] = part.split("=");
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    const timestamp = parts["t"];
    const expectedSig = parts["v1"];

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(signedPayload)
    );

    const computedSig = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return computedSig === expectedSig;
}

serve(async (req) => {
    try {
        if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
            throw new Error("Stripe configuration missing");
        }

        const signature = req.headers.get("stripe-signature");
        if (!signature) {
            throw new Error("Missing stripe-signature header");
        }

        const payload = await req.text();

        // Verify webhook signature
        const isValid = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET);
        if (!isValid) {
            throw new Error("Invalid signature");
        }

        const event = JSON.parse(payload);

        // Initialize Supabase client with service role for admin operations
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const bookingId = session.metadata.booking_id;
                const interviewerId = session.metadata.interviewer_id;
                const platformFee = parseInt(session.metadata.platform_fee) || 0;
                const totalAmount = session.amount_total;
                const interviewerAmount = totalAmount - platformFee;

                // Update booking status
                const { error: bookingError } = await supabase
                    .from("bookings")
                    .update({
                        payment_status: "completed",
                        status: "confirmed",
                        stripe_payment_intent_id: session.payment_intent,
                        interviewer_amount_cents: interviewerAmount,
                    })
                    .eq("id", bookingId);

                if (bookingError) {
                    console.error("Error updating booking:", bookingError);
                }

                // Credit interviewer wallet
                const { data: wallet } = await supabase
                    .from("wallets")
                    .select("*")
                    .eq("user_id", interviewerId)
                    .single();

                if (wallet) {
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
                        type: "earning",
                        amount_cents: interviewerAmount,
                        balance_after_cents: wallet.balance_cents,
                        description: `Interview booking payment`,
                        booking_id: bookingId,
                    });
                }

                console.log(`Payment completed for booking ${bookingId}`);
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                // Find booking by payment intent and mark as failed
                const { error } = await supabase
                    .from("bookings")
                    .update({ payment_status: "failed" })
                    .eq("stripe_payment_intent_id", paymentIntent.id);

                if (error) {
                    console.error("Error updating failed payment:", error);
                }
                break;
            }

            case "charge.refunded": {
                const charge = event.data.object;
                // Update booking refund status
                const { error } = await supabase
                    .from("bookings")
                    .update({
                        payment_status: "refunded",
                        stripe_refund_id: charge.refunds.data[0]?.id,
                    })
                    .eq("stripe_payment_intent_id", charge.payment_intent);

                if (error) {
                    console.error("Error updating refund:", error);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Webhook error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
