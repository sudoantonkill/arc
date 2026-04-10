import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';

const DAILY_KEY = 'daily';

interface CreateRoomResponse {
    roomUrl: string;
    roomName: string;
    token: string;
}

// Create a Daily.co room for a booking
export function useCreateDailyRoom() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useMutation({
        mutationFn: async ({
            bookingId,
            scheduledAt,
            durationMinutes,
        }: {
            bookingId: string;
            scheduledAt: string;
            durationMinutes: number;
        }): Promise<CreateRoomResponse> => {
            if (!session) throw new Error('Not authenticated');
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase.functions.invoke('create-daily-room', {
                body: { bookingId, scheduledAt, durationMinutes },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            return data as CreateRoomResponse;
        },
    });
}

// Get meeting room URL from booking
export function useMeetingRoom(bookingId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [DAILY_KEY, 'room', bookingId],
        queryFn: async () => {
            if (!supabase || !bookingId) return null;

            const { data, error } = await supabase
                .from('bookings')
                .select('meeting_link, meeting_room_id')
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!supabase && !!bookingId,
    });
}

// Hook to manage Daily.co call state
export function useDailyCall(roomUrl: string | null) {
    // Track call state
    const joinCall = useCallback(async () => {
        if (!roomUrl) {
            throw new Error('No room URL available');
        }
        // This will be handled by the Daily React components
        return roomUrl;
    }, [roomUrl]);

    return {
        joinCall,
        roomUrl,
    };
}

// Check if Daily.co is configured
export function useDailyConfig() {
    return useQuery({
        queryKey: [DAILY_KEY, 'config'],
        queryFn: async () => {
            // Daily.co doesn't need client-side config for embedding
            // The room URL contains all necessary information
            return {
                isConfigured: true,
            };
        },
    });
}
