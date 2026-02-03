import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { CodeSession } from '@/types/database';

const CODE_KEY = 'code_session';

export function useCodeSession(bookingId: string) {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    // Fetch initial code state
    const { data: codeSession, isLoading } = useQuery({
        queryKey: [CODE_KEY, bookingId],
        queryFn: async (): Promise<CodeSession | null> => {
            if (!supabase || !bookingId) return null;

            // Try to find existing session
            const { data, error } = await supabase
                .from('code_sessions')
                .select('*')
                .eq('booking_id', bookingId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!supabase && !!bookingId,
    });

    // Subscriptions
    useEffect(() => {
        if (!supabase || !bookingId) return;

        const channel = supabase
            .channel(`code:${bookingId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'code_sessions',
                    filter: `booking_id=eq.${bookingId}`,
                },
                (payload) => {
                    const newData = payload.new as CodeSession;

                    // Don't update if I was the one who updated it (avoids loop/flicker)
                    // Note: Supabase Realtime payloads have the new row data.
                    // Ideally we check newData.updated_by !== session.user.id
                    if (session?.user?.id && newData.updated_by === session.user.id) {
                        return;
                    }

                    queryClient.setQueryData(
                        [CODE_KEY, bookingId],
                        newData
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, bookingId, queryClient, session?.user?.id]);

    // Update mutation
    const updateCode = useMutation({
        mutationFn: async ({ code, language }: { code: string; language: string }) => {
            if (!supabase || !session) throw new Error('Not authenticated');

            // Find or creat logic is handled by upsert with onConflict on booking_id
            const { data, error } = await supabase
                .from('code_sessions')
                .upsert({
                    booking_id: bookingId,
                    code,
                    language,
                    updated_by: session.user.id,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'booking_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
    });

    return {
        codeSession,
        isLoading,
        updateCode,
    };
}
