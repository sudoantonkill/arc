import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type {
    Booking,
    BookingWithDetails,
    CreateBookingInput,
    BookingStatus,
} from '@/types/database';

const BOOKINGS_KEY = 'bookings';

// Helper for manual joins when PostgREST foreign keys fail
async function executeWithManualJoinFallback(
    supabase: any,
    buildQuery: () => any,
    includeFeedback: boolean = false
): Promise<BookingWithDetails[]> {
    try {
        // Try the standard join first with a fresh builder
        let selectStr = '*, student_profile:student_profiles(*), interviewer_profile:interviewer_profiles(*)';
        if (includeFeedback) selectStr += ', feedback:interview_feedback(*)';
        
        const { data, error } = await buildQuery().select(selectStr);
        if (!error) return data ?? [];
        
        console.warn('Standard join failed, falling back to manual join', error);
    } catch (e) {
        console.warn('Standard join threw, falling back to manual join', e);
    }

    // Fallback: Manual join with a FRESH builder
    const { data: rawBookings, error: rawError } = await buildQuery().select('*');
    if (rawError) throw rawError;
    if (!rawBookings || rawBookings.length === 0) return [];

    const studentIds = [...new Set(rawBookings.map((b: any) => b.student_id))].filter(Boolean);
    const interviewerIds = [...new Set(rawBookings.map((b: any) => b.interviewer_id))].filter(Boolean);
    const bookingIds = includeFeedback ? rawBookings.map((b: any) => b.id) : [];

    const [studentsRes, interviewersRes, feedbackRes] = await Promise.all([
        studentIds.length > 0 ? supabase.from('student_profiles').select('*').in('user_id', studentIds) : Promise.resolve({ data: [] }),
        interviewerIds.length > 0 ? supabase.from('interviewer_profiles').select('*').in('user_id', interviewerIds) : Promise.resolve({ data: [] }),
        (includeFeedback && bookingIds.length > 0) ? supabase.from('interview_feedback').select('*').in('booking_id', bookingIds) : Promise.resolve({ data: [] })
    ]);

    const studentsMap = Object.fromEntries((studentsRes.data || []).map((p: any) => [p.user_id, p]));
    const interviewersMap = Object.fromEntries((interviewersRes.data || []).map((p: any) => [p.user_id, p]));
    // Group feedback by booking_id
    const feedbackMap: Record<string, any[]> = {};
    (feedbackRes.data || []).forEach((f: any) => {
        if (!feedbackMap[f.booking_id]) feedbackMap[f.booking_id] = [];
        feedbackMap[f.booking_id].push(f);
    });

    return rawBookings.map((b: any) => ({
        ...b,
        student_profile: studentsMap[b.student_id] || null,
        interviewer_profile: interviewersMap[b.interviewer_id] || null,
        ...(includeFeedback ? { feedback: feedbackMap[b.id] || [] } : {})
    }));
}

export function useBookings(filters?: { status?: BookingStatus; role?: 'student' | 'interviewer' }) {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, filters, session?.user?.id],
        queryFn: async (): Promise<BookingWithDetails[]> => {
            if (!supabase || !session) return [];

            const buildQuery = () => {
                let query = supabase.from('bookings');
                if (filters?.role === 'student') query = query.eq('student_id', session.user.id);
                else if (filters?.role === 'interviewer') query = query.eq('interviewer_id', session.user.id);
                
                if (filters?.status) query = query.eq('status', filters.status);
                
                return query.order('scheduled_at', { ascending: true });
            };

            return await executeWithManualJoinFallback(supabase, buildQuery);
        },
        enabled: !!supabase && !!session,
        refetchInterval: 3000,
    });
}

export function useBooking(bookingId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, bookingId],
        queryFn: async (): Promise<BookingWithDetails | null> => {
            if (!supabase || !bookingId) return null;

            const buildQuery = () => supabase.from('bookings').eq('id', bookingId);
            const results = await executeWithManualJoinFallback(supabase, buildQuery, true);
            return results.length > 0 ? results[0] : null;
        },
        enabled: !!supabase && !!bookingId,
        refetchInterval: 3000,
    });
}

export function useUpcomingBookings(role: 'student' | 'interviewer') {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, 'upcoming', role, session?.user?.id],
        queryFn: async (): Promise<BookingWithDetails[]> => {
            if (!supabase || !session) return [];

            const columnName = role === 'student' ? 'student_id' : 'interviewer_id';
            // Include 'pending' so students can see their bookings immediately
            const statuses = role === 'student'
                ? ['pending', 'confirmed', 'in_progress']
                : ['confirmed', 'in_progress'];

            const buildQuery = () => supabase
                .from('bookings')
                .eq(columnName, session.user.id)
                .in('status', statuses)
                .order('scheduled_at', { ascending: true });

            return await executeWithManualJoinFallback(supabase, buildQuery);
        },
        enabled: !!supabase && !!session,
        refetchInterval: 3000,
    });
}

// Fetch active bookings for a student (for filtering interviewers on homepage)
export function useStudentActiveBookings() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, 'active', 'student', session?.user?.id],
        queryFn: async (): Promise<{ interviewer_id: string; status: string }[]> => {
            if (!supabase || !session) return [];

            const { data, error } = await supabase
                .from('bookings')
                .select('interviewer_id, status')
                .eq('student_id', session.user.id)
                .in('status', ['pending', 'confirmed', 'in_progress']);

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
        refetchInterval: 3000,
    });
}

export function usePastBookings(role: 'student' | 'interviewer') {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, 'past', role, session?.user?.id],
        queryFn: async (): Promise<BookingWithDetails[]> => {
            if (!supabase || !session) return [];

            const columnName = role === 'student' ? 'student_id' : 'interviewer_id';

            const buildQuery = () => supabase
                .from('bookings')
                .eq(columnName, session.user.id)
                .in('status', ['completed', 'cancelled', 'no_show'])
                .order('scheduled_at', { ascending: false });

            return await executeWithManualJoinFallback(supabase, buildQuery, true);
        },
        enabled: !!supabase && !!session,
        refetchInterval: 3000,
    });
}

export function useCreateBooking() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateBookingInput): Promise<Booking> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            // Get interviewer rate
            const { data: interviewer, error: intError } = await supabase
                .from('interviewer_profiles')
                .select('hourly_rate_cents')
                .eq('user_id', input.interviewer_id)
                .single();

            if (intError || !interviewer) throw new Error('Interviewer not found');

            // Calculate pricing (in paise for INR)
            const hourlyRate = interviewer.hourly_rate_cents ?? 50000; // Default ₹500/hr
            const durationHours = input.duration_minutes / 60;
            const totalAmount = Math.round(hourlyRate * durationHours);
            const platformFee = Math.round(totalAmount * 0.5); // 50% commission
            const interviewerAmount = totalAmount - platformFee;

            const { data, error } = await supabase
                .from('bookings')
                .insert({
                    student_id: session.user.id,
                    interviewer_id: input.interviewer_id,
                    scheduled_at: input.scheduled_at,
                    duration_minutes: input.duration_minutes,
                    interview_type: input.interview_type,
                    target_company: input.target_company,
                    student_notes: input.student_notes,
                    proposed_times: input.proposed_times ?? [],
                    total_amount_cents: totalAmount,
                    platform_fee_cents: platformFee,
                    interviewer_amount_cents: interviewerAmount,
                    status: 'pending',
                    payment_status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
        },
    });
}

// Interviewer confirms a booking by picking one of the proposed times
export function useConfirmBookingTime() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ bookingId, scheduledAt, meetingLink }: {
            bookingId: string;
            scheduledAt: string;
            meetingLink?: string;
        }): Promise<Booking> => {
            if (!supabase) throw new Error('Supabase not configured');

            const updateData: Record<string, unknown> = {
                status: 'confirmed',
                scheduled_at: scheduledAt,
            };

            if (meetingLink) {
                updateData.meeting_link = meetingLink;
            }

            const { data, error } = await supabase
                .from('bookings')
                .update(updateData)
                .eq('id', bookingId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
        },
    });
}

export function useUpdateBookingStatus() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ bookingId, status, cancellationReason }: {
            bookingId: string;
            status: BookingStatus;
            cancellationReason?: string;
        }): Promise<Booking> => {
            if (!supabase) throw new Error('Supabase not configured');

            const updateData: Partial<Booking> = { status };
            if (status === 'cancelled' && cancellationReason) {
                updateData.cancellation_reason = cancellationReason;
            }

            const { data, error } = await supabase
                .from('bookings')
                .update(updateData)
                .eq('id', bookingId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
        },
    });
}

export function useCancelBooking() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }): Promise<void> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            // Get booking to determine who's cancelling
            const { data: booking, error: fetchError } = await supabase
                .from('bookings')
                .select('student_id, interviewer_id')
                .eq('id', bookingId)
                .single();

            if (fetchError || !booking) throw new Error('Booking not found');

            const cancelledBy = booking.student_id === session.user.id ? 'student' : 'interviewer';

            const { error } = await supabase
                .from('bookings')
                .update({
                    status: 'cancelled',
                    cancelled_by: cancelledBy,
                    cancellation_reason: reason,
                })
                .eq('id', bookingId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
        },
    });
}
