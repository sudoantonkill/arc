import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
    bookingId: string;
    interviewerId: string;
    amountPaise: number; // Amount in paise (1 INR = 100 paise)
    interviewType: string;
    scheduledAt: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay credentials not configured");
        }

        const requestData: CreateOrderRequest = await req.json();
        const { bookingId, interviewerId, amountPaise, interviewType, scheduledAt, studentName, studentEmail, studentPhone } = requestData;

        // Calculate platform fee (15%)
        const platformFee = Math.round(amountPaise * 0.15);
        const interviewerAmount = amountPaise - platformFee;

        // Create Razorpay Order
        const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

        const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: amountPaise,
                currency: "INR",
                receipt: `booking_${bookingId}`,
                notes: {
                    booking_id: bookingId,
                    interviewer_id: interviewerId,
                    platform_fee: platformFee.toString(),
                    interviewer_amount: interviewerAmount.toString(),
                },
            }),
        });

        const order = await orderResponse.json();

        if (order.error) {
            throw new Error(order.error.description || "Failed to create order");
        }

        // Update booking with order ID
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
            .from("bookings")
            .update({
                razorpay_order_id: order.id,
                interviewer_amount_cents: interviewerAmount, // Store in paise
            })
            .eq("id", bookingId);

        return new Response(
            JSON.stringify({
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: RAZORPAY_KEY_ID,
                prefill: {
                    name: studentName,
                    email: studentEmail,
                    contact: studentPhone || "",
                },
                notes: {
                    bookingId,
                    interviewType,
                    scheduledAt,
                },
                theme: {
                    color: "#6366f1", // Indigo brand color
                },
                callbackUrl: `${FRONTEND_URL}/app/student?payment=success&booking=${bookingId}`,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Create order error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
