import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    getBookingConfirmedEmail,
    getBookingReminderEmail,
    getBookingCancelledEmail,
    getFeedbackAvailableEmail,
    getPayoutProcessedEmail,
    getWelcomeEmail,
    type EmailTemplateType,
} from "../_shared/email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Interview Ace <noreply@interviewace.com>";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
    template: EmailTemplateType;
    data: Record<string, unknown>;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            console.warn("Resend API key not configured - emails will not be sent");
            return new Response(
                JSON.stringify({ success: false, message: "Email service not configured" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

        const { template, data }: SendEmailRequest = await req.json();

        // Generate email based on template
        let email;
        switch (template) {
            case "booking_confirmed":
                email = getBookingConfirmedEmail(data as any);
                break;
            case "booking_cancelled":
                email = getBookingCancelledEmail(data as any);
                break;
            case "booking_reminder_24h":
                email = getBookingReminderEmail(data as any, 24);
                break;
            case "booking_reminder_1h":
                email = getBookingReminderEmail(data as any, 1);
                break;
            case "feedback_available":
                email = getFeedbackAvailableEmail(data as any);
                break;
            case "payout_processed":
                email = getPayoutProcessedEmail(data as any);
                break;
            case "welcome":
                email = getWelcomeEmail(data as any);
                break;
            default:
                throw new Error(`Unknown email template: ${template}`);
        }

        // Send email via Resend
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: email.to,
                subject: email.subject,
                html: email.html,
                text: email.text,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Resend error:", result);
            throw new Error(result.message || "Failed to send email");
        }

        console.log(`Email sent successfully: ${template} to ${email.to}`);

        return new Response(
            JSON.stringify({ success: true, messageId: result.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    } catch (error) {
        console.error("Send email error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
