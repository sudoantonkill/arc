import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { Booking } from '@/types/database';

const PAYMENTS_KEY = 'payments';

// Payment intent creation for Stripe
export interface CreatePaymentIntentInput {
    bookingId: string;
    amountCents: number;
}

export interface PaymentIntent {
    clientSecret: string;
    paymentIntentId: string;
}

// Simulate payment intent creation (in production, this would call a Supabase Edge Function)
export function useCreatePaymentIntent() {
    const { session } = useSession();

    return useMutation({
        mutationFn: async (input: CreatePaymentIntentInput): Promise<PaymentIntent> => {
            if (!session) throw new Error('Not authenticated');

            // In production, this would call:
            // const response = await fetch('/api/create-payment-intent', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(input),
            // });

            // For demo, simulate a payment intent
            await new Promise(resolve => setTimeout(resolve, 500));

            return {
                clientSecret: `pi_demo_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
                paymentIntentId: `pi_demo_${Date.now()}`,
            };
        },
    });
}

// Confirm payment after Stripe Elements submission
export function useConfirmPayment() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            bookingId,
            paymentIntentId
        }: {
            bookingId: string;
            paymentIntentId: string;
        }): Promise<Booking> => {
            if (!supabase) throw new Error('Supabase not configured');

            // Update booking with payment info
            const { data, error } = await supabase
                .from('bookings')
                .update({
                    payment_status: 'completed',
                    stripe_payment_intent_id: paymentIntentId,
                    status: 'confirmed', // Auto-confirm after payment
                })
                .eq('id', bookingId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
        },
    });
}

// Process refund
export function useProcessRefund() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            bookingId,
            reason
        }: {
            bookingId: string;
            reason: string;
        }): Promise<Booking> => {
            if (!supabase) throw new Error('Supabase not configured');

            // In production, this would:
            // 1. Call Stripe API to create refund
            // 2. Update booking status

            const refundId = `re_demo_${Date.now()}`;

            const { data, error } = await supabase
                .from('bookings')
                .update({
                    payment_status: 'refunded',
                    stripe_refund_id: refundId,
                    status: 'cancelled',
                    cancellation_reason: reason,
                })
                .eq('id', bookingId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
        },
    });
}

// Get payment history for user
export function usePaymentHistory() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [PAYMENTS_KEY, 'history', session?.user?.id],
        queryFn: async () => {
            if (!supabase || !session) return [];

            const { data, error } = await supabase
                .from('bookings')
                .select(`
          id,
          scheduled_at,
          interview_type,
          total_amount_cents,
          payment_status,
          stripe_payment_intent_id,
          created_at,
          interviewer_profile:interviewer_profiles!bookings_interviewer_id_fkey(company_background)
        `)
                .eq('student_id', session.user.id)
                .neq('payment_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

// Stripe configuration check
export function useStripeConfig() {
    return useQuery({
        queryKey: ['stripe', 'config'],
        queryFn: async () => {
            // In production, this would check if Stripe is configured
            // For now, we'll simulate it as not configured
            return {
                isConfigured: false,
                publishableKey: null,
            };
        },
    });
}
