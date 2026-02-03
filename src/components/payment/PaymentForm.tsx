import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCreatePaymentIntent, useConfirmPayment, useStripeConfig } from "@/hooks/usePayments";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@/hooks/useWallet";
import {
    CreditCard,
    Lock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Shield
} from "lucide-react";

interface PaymentFormProps {
    bookingId: string;
    amountCents: number;
    interviewerName: string;
    interviewType: string;
    scheduledAt: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function PaymentForm({
    bookingId,
    amountCents,
    interviewerName,
    interviewType,
    scheduledAt,
    onSuccess,
    onCancel,
}: PaymentFormProps) {
    const { toast } = useToast();
    const { data: stripeConfig } = useStripeConfig();
    const createPaymentIntent = useCreatePaymentIntent();
    const confirmPayment = useConfirmPayment();

    const [cardNumber, setCardNumber] = React.useState('');
    const [expiry, setExpiry] = React.useState('');
    const [cvc, setCvc] = React.useState('');
    const [name, setName] = React.useState('');
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isComplete, setIsComplete] = React.useState(false);

    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : v;
    };

    // Format expiry as MM/YY
    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
        }
        return v;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (cardNumber.replace(/\s/g, '').length !== 16) {
            toast({ title: "Invalid card number", variant: "destructive" });
            return;
        }
        if (expiry.length !== 5) {
            toast({ title: "Invalid expiry date", variant: "destructive" });
            return;
        }
        if (cvc.length < 3) {
            toast({ title: "Invalid CVC", variant: "destructive" });
            return;
        }

        setIsProcessing(true);

        try {
            // Step 1: Create payment intent
            const paymentIntent = await createPaymentIntent.mutateAsync({
                bookingId,
                amountCents,
            });

            // Step 2: Simulate Stripe payment confirmation
            // In production, this would use Stripe Elements
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Step 3: Update booking with payment confirmation
            await confirmPayment.mutateAsync({
                bookingId,
                paymentIntentId: paymentIntent.paymentIntentId,
            });

            setIsComplete(true);
            toast({ title: "Payment successful!" });

            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (error) {
            toast({
                title: "Payment failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isComplete) {
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
                    <p className="text-muted-foreground">
                        Your interview has been confirmed. You'll receive a confirmation email shortly.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Complete Payment
                </CardTitle>
                <CardDescription>
                    Secure payment powered by Stripe
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Order Summary */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>{interviewType} Interview</span>
                        <span className="font-medium">{formatCents(amountCents)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        with {interviewerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {new Date(scheduledAt).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                        })}
                    </div>
                </div>

                <Separator />

                {/* Payment Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Cardholder Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="card">Card Number</Label>
                        <div className="relative">
                            <Input
                                id="card"
                                placeholder="4242 4242 4242 4242"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                maxLength={19}
                                className="pl-10"
                                required
                            />
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input
                                id="expiry"
                                placeholder="MM/YY"
                                value={expiry}
                                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                maxLength={5}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cvc">CVC</Label>
                            <Input
                                id="cvc"
                                placeholder="123"
                                value={cvc}
                                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                maxLength={4}
                                required
                            />
                        </div>
                    </div>

                    {/* Test Card Notice */}
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">🧪 Demo Mode</p>
                        <p>Use test card: 4242 4242 4242 4242, any future date, any 3-digit CVC</p>
                    </div>
                </form>
            </CardContent>

            <CardFooter className="flex-col gap-4">
                <div className="flex gap-3 w-full">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isProcessing || !cardNumber || !expiry || !cvc || !name}
                        className="flex-1"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4 mr-2" />
                                Pay {formatCents(amountCents)}
                            </>
                        )}
                    </Button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Secured with 256-bit SSL encryption</span>
                </div>
            </CardFooter>
        </Card>
    );
}
