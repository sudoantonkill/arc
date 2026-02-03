import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type {
    InterviewerProfile,
    InterviewerWithDetails,
    AvailabilitySlot,
    AvailabilitySlotInput,
    UpdateInterviewerProfileInput,
} from '@/types/database';

const INTERVIEWERS_KEY = 'interviewers';
const AVAILABILITY_KEY = 'availability';

// ============ INTERVIEWER BROWSING ============

export function useInterviewers(filters?: {
    specialty?: string;
    company?: string;
    minRate?: number;
    maxRate?: number;
}) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [INTERVIEWERS_KEY, 'list', filters],
        queryFn: async (): Promise<InterviewerWithDetails[]> => {
            if (!supabase) return [];

            let query = supabase
                .from('interviewer_profiles')
                .select('*')
                .eq('verification_status', 'approved');

            // Apply filters
            if (filters?.specialty) {
                query = query.contains('specialties', [filters.specialty]);
            }
            if (filters?.minRate) {
                query = query.gte('hourly_rate_cents', filters.minRate);
            }
            if (filters?.maxRate) {
                query = query.lte('hourly_rate_cents', filters.maxRate);
            }

            const { data: profiles, error } = await query;
            if (error) throw error;

            // Enhance with ratings (in a real app, this would be a view or computed column)
            const enhanced: InterviewerWithDetails[] = (profiles ?? []).map(p => ({
                ...p,
                average_rating: 0, // Will be computed
                review_count: 0,
                completed_interviews: 0,
            }));

            return enhanced;
        },
        enabled: !!supabase,
    });
}

export function useInterviewer(interviewerId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [INTERVIEWERS_KEY, interviewerId],
        queryFn: async (): Promise<InterviewerWithDetails | null> => {
            if (!supabase || !interviewerId) return null;

            // Get profile
            const { data: profile, error: profileError } = await supabase
                .from('interviewer_profiles')
                .select('*')
                .eq('user_id', interviewerId)
                .single();

            if (profileError) throw profileError;

            // Get availability slots
            const { data: slots } = await supabase
                .from('availability_slots')
                .select('*')
                .eq('interviewer_id', interviewerId)
                .eq('is_active', true);

            // Get reviews for rating calculation
            const { data: reviews } = await supabase
                .from('interviewer_reviews')
                .select('rating')
                .eq('interviewer_id', interviewerId)
                .eq('is_visible', true);

            const avgRating = reviews?.length
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

            return {
                ...profile,
                average_rating: Math.round(avgRating * 10) / 10,
                review_count: reviews?.length ?? 0,
                completed_interviews: 0, // Would need another query
                availability_slots: slots ?? [],
            };
        },
        enabled: !!supabase && !!interviewerId,
    });
}

// ============ INTERVIEWER PROFILE MANAGEMENT ============

export function useMyInterviewerProfile() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [INTERVIEWERS_KEY, 'my-profile', session?.user?.id],
        queryFn: async (): Promise<InterviewerProfile | null> => {
            if (!supabase || !session) return null;

            const { data, error } = await supabase
                .from('interviewer_profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!supabase && !!session,
    });
}

export function useUpdateInterviewerProfile() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateInterviewerProfileInput): Promise<InterviewerProfile> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('interviewer_profiles')
                .upsert(
                    { user_id: session.user.id, ...input },
                    { onConflict: 'user_id' }
                )
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INTERVIEWERS_KEY] });
        },
    });
}

// ============ AVAILABILITY MANAGEMENT ============

export function useMyAvailability() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [AVAILABILITY_KEY, session?.user?.id],
        queryFn: async (): Promise<AvailabilitySlot[]> => {
            if (!supabase || !session) return [];

            const { data, error } = await supabase
                .from('availability_slots')
                .select('*')
                .eq('interviewer_id', session.user.id)
                .order('day_of_week')
                .order('start_time');

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

export function useInterviewerAvailability(interviewerId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [AVAILABILITY_KEY, interviewerId],
        queryFn: async (): Promise<AvailabilitySlot[]> => {
            if (!supabase || !interviewerId) return [];

            const { data, error } = await supabase
                .from('availability_slots')
                .select('*')
                .eq('interviewer_id', interviewerId)
                .eq('is_active', true)
                .order('day_of_week')
                .order('start_time');

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!interviewerId,
    });
}

export function useAddAvailabilitySlot() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AvailabilitySlotInput): Promise<AvailabilitySlot> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('availability_slots')
                .insert({
                    interviewer_id: session.user.id,
                    ...input,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
        },
    });
}

export function useUpdateAvailabilitySlot() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ slotId, ...input }: AvailabilitySlotInput & { slotId: string }): Promise<AvailabilitySlot> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase
                .from('availability_slots')
                .update(input)
                .eq('id', slotId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
        },
    });
}

export function useDeleteAvailabilitySlot() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (slotId: string): Promise<void> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { error } = await supabase
                .from('availability_slots')
                .delete()
                .eq('id', slotId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
        },
    });
}
