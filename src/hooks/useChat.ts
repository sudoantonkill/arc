import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { ChatMessage } from '@/types/database';

const CHAT_KEY = 'chat_messages';

export function useChat(bookingId: string) {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    // Fetch initial messages
    const { data: messages = [], isLoading } = useQuery({
        queryKey: [CHAT_KEY, bookingId],
        queryFn: async (): Promise<ChatMessage[]> => {
            if (!supabase || !bookingId) return [];

            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!bookingId,
    });

    // Real-time subscription
    useEffect(() => {
        if (!supabase || !bookingId) return;

        const channel = supabase
            .channel(`chat:${bookingId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `booking_id=eq.${bookingId}`,
                },
                (payload) => {
                    queryClient.setQueryData(
                        [CHAT_KEY, bookingId],
                        (oldData: ChatMessage[] | undefined) => {
                            const newMessage = payload.new as ChatMessage;
                            if (!oldData) return [newMessage];
                            // Deduplicate just in case
                            if (oldData.some(m => m.id === newMessage.id)) return oldData;
                            return [...oldData, newMessage];
                        }
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, bookingId, queryClient]);

    // Send message mutation
    const sendMessage = useMutation({
        mutationFn: async ({ content, type = 'text' }: { content: string; type?: 'text' | 'code' }) => {
            if (!supabase || !session) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    booking_id: bookingId,
                    sender_id: session.user.id,
                    content,
                    type,
                });

            if (error) throw error;
        },
    });

    return {
        messages,
        isLoading,
        sendMessage,
    };
}
