import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePaymentHistory } from "@/hooks/usePayments";
import { formatCents } from "@/hooks/useWallet";
import {
    Receipt,
    Download,
    CheckCircle,
    XCircle,
    Clock,
    CreditCard,
    ExternalLink
} from "lucide-react";
import { format } from "date-fns";

export default function PaymentHistory() {
    const { data: payments = [], isLoading } = usePaymentHistory();

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
            case 'refunded':
                return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Refunded</Badge>;
            case 'failed':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
            case 'processing':
                return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Processing</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-muted rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment History
                </CardTitle>
                <CardDescription>
                    Your past payments and invoices
                </CardDescription>
            </CardHeader>
            <CardContent>
                {payments.length === 0 ? (
                    <div className="text-center py-12">
                        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="font-medium">No payments yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your payment history will appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payments.map(payment => (
                            <div
                                key={payment.id}
                                className="flex items-center justify-between p-4 rounded-lg border"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{payment.interview_type} Interview</span>
                                        {getStatusBadge(payment.payment_status)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {payment.interviewer_profile?.company_background || 'Interviewer'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(payment.scheduled_at), 'MMM d, yyyy • h:mm a')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{formatCents(payment.total_amount_cents)}</p>
                                    {payment.stripe_payment_intent_id && (
                                        <Button variant="ghost" size="sm" className="text-xs h-auto p-0 mt-1">
                                            <Download className="h-3 w-3 mr-1" />
                                            Receipt
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
