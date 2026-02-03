import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type {
    InterviewFeedback,
    SubmitFeedbackInput,
} from '@/types/database';

const FEEDBACK_KEY = 'feedback';

export function useFeedback(bookingId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [FEEDBACK_KEY, bookingId],
        queryFn: async (): Promise<InterviewFeedback | null> => {
            if (!supabase || !bookingId) return null;

            const { data, error } = await supabase
                .from('interview_feedback')
                .select('*')
                .eq('booking_id', bookingId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!supabase && !!bookingId,
    });
}

export function useMyFeedbackReports() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [FEEDBACK_KEY, 'my-reports', session?.user?.id],
        queryFn: async (): Promise<(InterviewFeedback & { booking: { scheduled_at: string; interview_type: string } })[]> => {
            if (!supabase || !session) return [];

            // Get feedback for student's completed bookings
            const { data, error } = await supabase
                .from('interview_feedback')
                .select(`
          *,
          booking:bookings!inner(
            scheduled_at,
            interview_type,
            student_id
          )
        `)
                .eq('is_published', true)
                .eq('booking.student_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

export function usePendingFeedback() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [FEEDBACK_KEY, 'pending', session?.user?.id],
        queryFn: async (): Promise<{ booking_id: string; scheduled_at: string; student_id: string }[]> => {
            if (!supabase || !session) return [];

            // Get completed bookings without feedback
            const { data, error } = await supabase
                .from('bookings')
                .select('id, scheduled_at, student_id')
                .eq('interviewer_id', session.user.id)
                .eq('status', 'completed')
                .is('meeting_link', null) // Placeholder - should check if feedback exists
                .order('scheduled_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            // Filter to only bookings without feedback
            const bookingsWithoutFeedback = [];
            for (const booking of data ?? []) {
                const { data: feedback } = await supabase
                    .from('interview_feedback')
                    .select('id')
                    .eq('booking_id', booking.id)
                    .maybeSingle();

                if (!feedback) {
                    bookingsWithoutFeedback.push({
                        booking_id: booking.id,
                        scheduled_at: booking.scheduled_at,
                        student_id: booking.student_id,
                    });
                }
            }

            return bookingsWithoutFeedback;
        },
        enabled: !!supabase && !!session,
    });
}

export function useSubmitFeedback() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: SubmitFeedbackInput): Promise<InterviewFeedback> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('interview_feedback')
                .insert({
                    booking_id: input.booking_id,
                    technical_rating: input.technical_rating,
                    problem_solving_rating: input.problem_solving_rating,
                    communication_rating: input.communication_rating,
                    soft_skills_rating: input.soft_skills_rating,
                    confidence_rating: input.confidence_rating,
                    body_language_rating: input.body_language_rating,
                    strengths: input.strengths,
                    weaknesses: input.weaknesses,
                    improvement_roadmap: input.improvement_roadmap,
                    interviewer_notes: input.interviewer_notes,
                    recommended_resources: input.recommended_resources ?? [],
                    overall_rating: input.overall_rating,
                    would_hire: input.would_hire,
                    hire_level: input.hire_level,
                    is_published: false, // Will need to explicitly publish
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [FEEDBACK_KEY] });
        },
    });
}

export function useUpdateFeedback() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ feedbackId, ...input }: Partial<SubmitFeedbackInput> & { feedbackId: string }): Promise<InterviewFeedback> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase
                .from('interview_feedback')
                .update(input)
                .eq('id', feedbackId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [FEEDBACK_KEY] });
        },
    });
}

export function usePublishFeedback() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (feedbackId: string): Promise<void> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { error } = await supabase
                .from('interview_feedback')
                .update({ is_published: true })
                .eq('id', feedbackId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [FEEDBACK_KEY] });
        },
    });
}

// Helper to calculate average rating from feedback
export function calculateAverageRating(feedback: InterviewFeedback): number {
    const ratings = [
        feedback.technical_rating,
        feedback.problem_solving_rating,
        feedback.communication_rating,
        feedback.soft_skills_rating,
        feedback.confidence_rating,
        feedback.body_language_rating,
    ].filter((r): r is number => r !== null && r !== undefined);

    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}
