import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWallet, useWalletTransactions, useRequestPayout, formatCents } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import {
    Wallet,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    DollarSign,
    Download,
    CreditCard
} from "lucide-react";
import { format } from "date-fns";

export default function EarningsDashboard() {
    const { toast } = useToast();
    const { data: wallet, isLoading: walletLoading } = useWallet();
    const { data: transactions = [], isLoading: txLoading } = useWalletTransactions();
    const requestPayout = useRequestPayout();

    const handleRequestPayout = async () => {
        if (!wallet || wallet.balance_cents < 5000) { // Minimum $50
            toast({
                title: "Minimum payout is $50",
                variant: "destructive"
            });
            return;
        }

        try {
            await requestPayout.mutateAsync(wallet.balance_cents);
            toast({
                title: "Payout requested!",
                description: "You'll receive your payment within 3-5 business days."
            });
        } catch (error) {
            toast({
                title: "Failed to request payout",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    if (walletLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-24 bg-muted rounded-lg" />
                        <div className="h-48 bg-muted rounded-lg" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const balance = wallet?.balance_cents ?? 0;
    const pending = wallet?.pending_cents ?? 0;
    const totalEarned = wallet?.total_earned_cents ?? 0;
    const totalWithdrawn = wallet?.total_withdrawn_cents ?? 0;

    return (
        <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-100">Available Balance</CardDescription>
                        <CardTitle className="text-3xl font-bold">{formatCents(balance)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-green-100 text-sm">
                            <Wallet className="h-4 w-4" />
                            Ready to withdraw
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pending</CardDescription>
                        <CardTitle className="text-2xl">{formatCents(pending)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock className="h-4 w-4" />
                            In processing
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Earned</CardDescription>
                        <CardTitle className="text-2xl">{formatCents(totalEarned)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-green-500 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            All time
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Withdrawn</CardDescription>
                        <CardTitle className="text-2xl">{formatCents(totalWithdrawn)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Download className="h-4 w-4" />
                            Paid out
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payout Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Request Payout
                    </CardTitle>
                    <CardDescription>
                        Minimum payout amount is $50. Payouts are processed within 3-5 business days.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Available for payout</p>
                            <p className="text-2xl font-bold">{formatCents(balance)}</p>
                        </div>
                        <Button
                            size="lg"
                            onClick={handleRequestPayout}
                            disabled={balance < 5000 || requestPayout.isPending}
                        >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Request Payout
                        </Button>
                    </div>
                    {balance < 5000 && (
                        <div className="mt-4">
                            <p className="text-sm text-muted-foreground mb-2">
                                {formatCents(5000 - balance)} more needed for minimum payout
                            </p>
                            <Progress value={(balance / 5000) * 100} className="h-2" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Your recent earnings and payouts</CardDescription>
                </CardHeader>
                <CardContent>
                    {txLoading ? (
                        <div className="animate-pulse space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-muted rounded-lg" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No transactions yet</p>
                            <p className="text-sm">Complete interviews to start earning!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map(tx => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-4 rounded-lg border"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${tx.type === 'credit'
                                                ? 'bg-green-100 text-green-600'
                                                : tx.type === 'payout'
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {tx.type === 'credit' ? (
                                                <ArrowDownRight className="h-4 w-4" />
                                            ) : (
                                                <ArrowUpRight className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{tx.description || tx.type}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${tx.amount_cents > 0 ? 'text-green-600' : ''
                                            }`}>
                                            {tx.amount_cents > 0 ? '+' : ''}{formatCents(tx.amount_cents)}
                                        </p>
                                        {tx.payout_status && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${tx.payout_status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : tx.payout_status === 'failed'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {tx.payout_status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
