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

export function useBookings(filters?: { status?: BookingStatus; role?: 'student' | 'interviewer' }) {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, filters, session?.user?.id],
        queryFn: async (): Promise<BookingWithDetails[]> => {
            if (!supabase || !session) return [];

            let query = supabase
                .from('bookings')
                .select(`
          *,
          student_profile:student_profiles(*),
          interviewer_profile:interviewer_profiles(*)
        `)
                .order('scheduled_at', { ascending: true });

            // Filter by role
            if (filters?.role === 'student') {
                query = query.eq('student_id', session.user.id);
            } else if (filters?.role === 'interviewer') {
                query = query.eq('interviewer_id', session.user.id);
            }

            // Filter by status
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

export function useBooking(bookingId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [BOOKINGS_KEY, bookingId],
        queryFn: async (): Promise<BookingWithDetails | null> => {
            if (!supabase || !bookingId) return null;

            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          student_profile:student_profiles(*),
          interviewer_profile:interviewer_profiles(*),
          feedback:interview_feedback(*)
        `)
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!supabase && !!bookingId,
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

            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          student_profile:student_profiles(*),
          interviewer_profile:interviewer_profiles(*)
        `)
                .eq(columnName, session.user.id)
                .in('status', statuses)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
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

            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          student_profile:student_profiles(*),
          interviewer_profile:interviewer_profiles(*),
          feedback:interview_feedback(*)
        `)
                .eq(columnName, session.user.id)
                .in('status', ['completed', 'cancelled', 'no_show'])
                .order('scheduled_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
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
