import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/hooks/useWallet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

export default function PaymentsManagement() {
    const supabase = getSupabaseClient();
    const [transactions, setTransactions] = React.useState<any[]>([]);
    const [stats, setStats] = React.useState({
        totalRevenue: 0,
        pendingPayouts: 0,
        completedPayouts: 0
    });
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!supabase) return;

        const fetchData = async () => {
            setIsLoading(true);

            // Fetch transactions
            const { data: txs } = await supabase
                .from('wallet_transactions')
                .select('*, wallets!inner(user_id)')
                .order('created_at', { ascending: false });

            if (txs) setTransactions(txs);

            // Fetch platform fee stats from bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select('platform_fee_cents, status')
                .eq('status', 'completed');

            const revenue = bookings?.reduce((sum, b) => sum + (b.platform_fee_cents || 0), 0) || 0;

            // Payout stats
            const pending = txs?.filter(t => t.type === 'payout' && t.payout_status === 'pending')
                .reduce((sum, t) => sum + t.amount_cents, 0) || 0;

            const paid = txs?.filter(t => t.type === 'payout' && t.payout_status === 'completed')
                .reduce((sum, t) => sum + t.amount_cents, 0) || 0;

            setStats({
                totalRevenue: revenue,
                pendingPayouts: pending,
                completedPayouts: paid
            });

            setIsLoading(false);
        };

        fetchData();
    }, [supabase]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCents(stats.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Platform commissions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCents(stats.pendingPayouts)}</div>
                        <p className="text-xs text-muted-foreground">Waiting for processing</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Payouts</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCents(stats.completedPayouts)}</div>
                        <p className="text-xs text-muted-foreground">Total paid to interviewers</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Recent wallet functionality across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            Loading transactions...
                                        </TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="capitalize">{tx.type}</TableCell>
                                            <TableCell>{tx.description || '-'}</TableCell>
                                            <TableCell className={tx.type === 'credit' ? 'text-green-600' : ''}>
                                                {tx.type === 'debit' ? '-' : '+'}{formatCents(tx.amount_cents)}
                                            </TableCell>
                                            <TableCell>
                                                {tx.payout_status && (
                                                    <Badge variant={
                                                        tx.payout_status === 'completed' ? 'default' :
                                                            tx.payout_status === 'failed' ? 'destructive' : 'outline'
                                                    }>
                                                        {tx.payout_status}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
