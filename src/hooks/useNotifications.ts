import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { Notification } from '@/types/database';

const NOTIFICATIONS_KEY = 'notifications';

export function useNotifications() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [NOTIFICATIONS_KEY, session?.user?.id],
        queryFn: async (): Promise<Notification[]> => {
            if (!supabase || !session) return [];

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

export function useUnreadNotificationCount() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [NOTIFICATIONS_KEY, 'unread-count', session?.user?.id],
        queryFn: async (): Promise<number> => {
            if (!supabase || !session) return 0;

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false);

            if (error) throw error;
            return count ?? 0;
        },
        enabled: !!supabase && !!session,
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}

export function useMarkNotificationRead() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string): Promise<void> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<void> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
        },
    });
}

// Real-time subscription hook
export function useNotificationSubscription(onNewNotification?: (notification: Notification) => void) {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    // Set up real-time subscription
    if (supabase && session) {
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
                    onNewNotification?.(newNotification);
                }
            )
            .subscribe();

        // Return cleanup function
        return () => {
            supabase.removeChannel(channel);
        };
    }

    return () => { };
}
