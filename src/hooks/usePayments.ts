import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { Booking } from '@/types/database';

const PAYMENTS_KEY = 'payments';

// Razorpay Order Response
export interface RazorpayOrderResponse {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
    notes: Record<string, string>;
    theme: {
        color: string;
    };
    callbackUrl: string;
}

// Create Razorpay Order input
export interface CreateOrderInput {
    bookingId: string;
    interviewerId: string;
    amountPaise: number;
    interviewType: string;
    scheduledAt: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string;
}

// Create Razorpay order via Edge Function
export function useCreateRazorpayOrder() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useMutation({
        mutationFn: async (input: CreateOrderInput): Promise<RazorpayOrderResponse> => {
            if (!session) throw new Error('Not authenticated');
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
                body: input,
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            return data as RazorpayOrderResponse;
        },
    });
}

// Verify payment after Razorpay checkout
export function useVerifyRazorpayPayment() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
            booking_id: string;
        }): Promise<{ success: boolean }> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
                body: payload,
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Payment verification failed');

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
        },
    });
}

// Hook to open Razorpay checkout
export function useRazorpayCheckout() {
    const createOrder = useCreateRazorpayOrder();
    const verifyPayment = useVerifyRazorpayPayment();

    const openCheckout = async (
        input: CreateOrderInput,
        onSuccess?: () => void,
        onError?: (error: Error) => void
    ) => {
        try {
            const orderData = await createOrder.mutateAsync(input);

            // Load Razorpay script if not already loaded
            if (!(window as any).Razorpay) {
                await loadRazorpayScript();
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'ArcInterview',
                description: `${orderData.notes.interviewType} Interview`,
                order_id: orderData.orderId,
                prefill: orderData.prefill,
                theme: orderData.theme,
                handler: async function (response: any) {
                    try {
                        await verifyPayment.mutateAsync({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            booking_id: input.bookingId,
                        });
                        onSuccess?.();
                    } catch (err) {
                        onError?.(err as Error);
                    }
                },
                modal: {
                    ondismiss: function () {
                        console.log('Payment cancelled by user');
                    },
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error) {
            onError?.(error as Error);
        }
    };

    return {
        openCheckout,
        isLoading: createOrder.isPending || verifyPayment.isPending,
        error: createOrder.error || verifyPayment.error,
    };
}

// Helper to load Razorpay script
function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((window as any).Razorpay) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
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

            // For refunds, you would call Razorpay refund API
            // For now, we just update the booking status
            const refundId = `rfnd_manual_${Date.now()}`;

            const { data, error } = await supabase
                .from('bookings')
                .update({
                    payment_status: 'refunded',
                    razorpay_refund_id: refundId,
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
                    razorpay_payment_id,
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

// Razorpay configuration check
export function useRazorpayConfig() {
    return useQuery({
        queryKey: ['razorpay', 'config'],
        queryFn: async () => {
            const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

            return {
                isConfigured: Boolean(keyId),
                keyId: keyId || null,
            };
        },
    });
}
