import * as React from "react";
import { Button } from "@/components/ui/button";
import { useRazorpayCheckout, useRazorpayConfig } from "@/hooks/usePayments";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface CheckoutButtonProps {
    bookingId: string;
    interviewerId: string;
    amountPaise: number; // Amount in paise (1 INR = 100 paise)
    interviewType: string;
    scheduledAt: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string;
    onSuccess?: () => void;
    className?: string;
    disabled?: boolean;
}

export default function CheckoutButton({
    bookingId,
    interviewerId,
    amountPaise,
    interviewType,
    scheduledAt,
    studentName,
    studentEmail,
    studentPhone,
    onSuccess,
    className,
    disabled = false,
}: CheckoutButtonProps) {
    const { toast } = useToast();
    const { data: razorpayConfig } = useRazorpayConfig();
    const { openCheckout, isLoading, error } = useRazorpayCheckout();

    const handleClick = async () => {
        openCheckout(
            {
                bookingId,
                interviewerId,
                amountPaise,
                interviewType,
                scheduledAt,
                studentName,
                studentEmail,
                studentPhone,
            },
            () => {
                toast({
                    title: "Payment successful!",
                    description: "Your interview has been confirmed.",
                });
                onSuccess?.();
            },
            (err) => {
                toast({
                    title: "Payment failed",
                    description: err.message || "Please try again",
                    variant: "destructive",
                });
            }
        );
    };

    // Format price in INR
    const formattedPrice = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amountPaise / 100);

    if (!razorpayConfig?.isConfigured) {
        return (
            <Alert variant="destructive" className={className}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Payment system not configured. Please contact support.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className={className}>
            <Button
                onClick={handleClick}
                disabled={disabled || isLoading}
                className="w-full"
                size="lg"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay {formattedPrice}
                    </>
                )}
            </Button>

            {error && (
                <p className="text-sm text-destructive mt-2">
                    {error instanceof Error ? error.message : 'Payment failed. Please try again.'}
                </p>
            )}

            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>UPI</span>
                <span>•</span>
                <span>Cards</span>
                <span>•</span>
                <span>Net Banking</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
                Secure payment powered by Razorpay
            </p>
        </div>
    );
}
