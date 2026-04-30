import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';
import type { Wallet, WalletTransaction } from '@/types/database';

const WALLET_KEY = 'wallet';

export function useWallet() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [WALLET_KEY, session?.user?.id],
        queryFn: async (): Promise<Wallet | null> => {
            if (!supabase || !session) return null;

            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!supabase && !!session,
    });
}

export function useWalletTransactions() {
    const { session } = useSession();
    const supabase = getSupabaseClient();

    return useQuery({
        queryKey: [WALLET_KEY, 'transactions', session?.user?.id],
        queryFn: async (): Promise<WalletTransaction[]> => {
            if (!supabase || !session) return [];

            // First get the wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (walletError || !wallet) return [];

            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('wallet_id', wallet.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!supabase && !!session,
    });
}

export function useRequestPayout() {
    const { session } = useSession();
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (amountCents: number): Promise<WalletTransaction> => {
            if (!supabase || !session) throw new Error('Not authenticated');

            // Get wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            if (walletError || !wallet) throw new Error('Wallet not found');

            if (wallet.balance_cents < amountCents) {
                throw new Error('Insufficient balance');
            }

            // Update wallet balance
            const newBalance = wallet.balance_cents - amountCents;
            const { error: updateError } = await supabase
                .from('wallets')
                .update({
                    balance_cents: newBalance,
                    pending_cents: (wallet.pending_cents ?? 0) + amountCents,
                })
                .eq('id', wallet.id);

            if (updateError) throw updateError;

            // Create transaction record
            const { data: transaction, error: txError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'payout',
                    amount_cents: -amountCents,
                    balance_after_cents: newBalance,
                    description: 'Payout request',
                    payout_status: 'pending',
                })
                .select()
                .single();

            if (txError) throw txError;
            return transaction;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [WALLET_KEY] });
        },
    });
}

// Admin function to process payouts
export function useProcessPayout() {
    const supabase = getSupabaseClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ transactionId, status, reference }: {
            transactionId: string;
            status: 'completed' | 'failed';
            reference?: string;
        }): Promise<void> => {
            if (!supabase) throw new Error('Supabase not configured');

            const { data: transaction, error: txError } = await supabase
                .from('wallet_transactions')
                .select('*, wallet:wallets(*)')
                .eq('id', transactionId)
                .single();

            if (txError || !transaction) throw new Error('Transaction not found');

            // Update transaction status
            await supabase
                .from('wallet_transactions')
                .update({
                    payout_status: status,
                    payout_reference: reference,
                })
                .eq('id', transactionId);

            // If completed, update wallet
            if (status === 'completed') {
                const amountCents = Math.abs(transaction.amount_cents);
                await supabase
                    .from('wallets')
                    .update({
                        pending_cents: Math.max(0, (transaction.wallet?.pending_cents ?? 0) - amountCents),
                        total_withdrawn_cents: (transaction.wallet?.total_withdrawn_cents ?? 0) + amountCents,
                    })
                    .eq('id', transaction.wallet_id);
            } else if (status === 'failed') {
                // Refund to balance
                const amountCents = Math.abs(transaction.amount_cents);
                await supabase
                    .from('wallets')
                    .update({
                        balance_cents: (transaction.wallet?.balance_cents ?? 0) + amountCents,
                        pending_cents: Math.max(0, (transaction.wallet?.pending_cents ?? 0) - amountCents),
                    })
                    .eq('id', transaction.wallet_id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [WALLET_KEY] });
        },
    });
}

// Helper to format currency (paise to INR)
export function formatCents(paise: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(paise / 100);
}
