import { useMutation, useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';

const MEETING_KEY = 'meeting';

interface CreateRoomResponse {
    roomUrl: string;
    roomName: string;
}

// Create a Jitsi Meet room for a booking
export function useCreateMeetingRoom() {
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

// Keep the old name as an alias for backwards compatibility
export const useCreateDailyRoom = useCreateMeetingRoom;

// Get meeting room URL from booking
export function useMeetingRoom(bookingId: string) {
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [MEETING_KEY, 'room', bookingId],
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
