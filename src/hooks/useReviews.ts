import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { InterviewerReview } from '@/types/database';

const REVIEWS_KEY = 'reviews';

export interface SubmitReviewInput {
    booking_id: string;
    interviewer_id: string;
    rating: number;
    review_text?: string;
    is_anonymous?: boolean;
}

export function useInterviewerReviews(interviewerId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [REVIEWS_KEY, 'interviewer', interviewerId],
        queryFn: async (): Promise<InterviewerReview[]> => {
            if (!supabase || !interviewerId) return [];

            const { data, error } = await supabase
                .from('interviewer_reviews')
                .select('*')
                .eq('interviewer_id', interviewerId)
                .eq('is_visible', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!interviewerId,
    });
}

export function useMyReviews() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [REVIEWS_KEY, 'my-reviews', session?.user?.id],
        queryFn: async (): Promise<InterviewerReview[]> => {
            if (!supabase || !session) return [];

            const { data, error } = await supabase
                .from('interviewer_reviews')
                .select('*')
                .eq('student_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

export function useSubmitReview() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: SubmitReviewInput): Promise<InterviewerReview> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            // Check if review already exists for this booking
            const { data: existing } = await supabase
                .from('interviewer_reviews')
                .select('id')
                .eq('booking_id', input.booking_id)
                .maybeSingle();

            if (existing) {
                throw new Error('You have already submitted a review for this interview');
            }

            const { data, error } = await supabase
                .from('interviewer_reviews')
                .insert({
                    booking_id: input.booking_id,
                    interviewer_id: input.interviewer_id,
                    student_id: session.user.id,
                    rating: input.rating,
                    review_text: input.review_text,
                    is_anonymous: input.is_anonymous ?? false,
                    is_visible: true,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [REVIEWS_KEY] });
        },
    });
}

export function useCheckReviewExists(bookingId: string) {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [REVIEWS_KEY, 'check', bookingId],
        queryFn: async (): Promise<boolean> => {
            if (!supabase || !session || !bookingId) return false;

            const { data } = await supabase
                .from('interviewer_reviews')
                .select('id')
                .eq('booking_id', bookingId)
                .eq('student_id', session.user.id)
                .maybeSingle();

            return !!data;
        },
        enabled: !!supabase && !!session && !!bookingId,
    });
}
