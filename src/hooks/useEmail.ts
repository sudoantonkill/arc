import { useMutation } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';

export type EmailTemplateType =
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'booking_reminder_24h'
    | 'booking_reminder_1h'
    | 'feedback_available'
    | 'payout_processed'
    | 'welcome';

interface SendEmailInput {
    template: EmailTemplateType;
    data: Record<string, unknown>;
}

interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// Send transactional email via Edge Function
export function useSendEmail() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useMutation({
        mutationFn: async (input: SendEmailInput): Promise<SendEmailResult> => {
            if (!session) throw new Error('Not authenticated');
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: input,
            });

            if (error) throw error;

            return data as SendEmailResult;
        },
    });
}

// Helper to send booking confirmation emails
export function useSendBookingConfirmation() {
    const sendEmail = useSendEmail();

    return {
        ...sendEmail,
        sendConfirmation: async (params: {
            recipientName: string;
            recipientEmail: string;
            otherPartyName: string;
            interviewType: string;
            scheduledAt: string;
            duration: number;
            meetingLink?: string;
        }) => {
            return sendEmail.mutateAsync({
                template: 'booking_confirmed',
                data: params,
            });
        },
    };
}

// Helper to send feedback available notification
export function useSendFeedbackNotification() {
    const sendEmail = useSendEmail();

    return {
        ...sendEmail,
        sendNotification: async (params: {
            studentName: string;
            studentEmail: string;
            interviewType: string;
            scheduledAt: string;
        }) => {
            return sendEmail.mutateAsync({
                template: 'feedback_available',
                data: params,
            });
        },
    };
}

// Helper to send welcome email
export function useSendWelcomeEmail() {
    const sendEmail = useSendEmail();

    return {
        ...sendEmail,
        sendWelcome: async (params: {
            name: string;
            email: string;
            role: 'student' | 'interviewer';
        }) => {
            return sendEmail.mutateAsync({
                template: 'welcome',
                data: params,
            });
        },
    };
}
