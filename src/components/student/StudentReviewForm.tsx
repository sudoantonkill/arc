import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSubmitReview } from "@/hooks/useReviews";
import { Star, Send, Eye, EyeOff } from "lucide-react";

interface StudentReviewFormProps {
    bookingId: string;
    interviewerId: string;
    interviewerName?: string;
    onSuccess?: () => void;
}

export default function StudentReviewForm({
    bookingId,
    interviewerId,
    interviewerName,
    onSuccess
}: StudentReviewFormProps) {
    const { toast } = useToast();
    const submitReview = useSubmitReview();

    const [rating, setRating] = React.useState(0);
    const [hoverRating, setHoverRating] = React.useState(0);
    const [reviewText, setReviewText] = React.useState("");
    const [isAnonymous, setIsAnonymous] = React.useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({
                title: "Please select a rating",
                variant: "destructive"
            });
            return;
        }

        try {
            await submitReview.mutateAsync({
                booking_id: bookingId,
                interviewer_id: interviewerId,
                rating,
                review_text: reviewText || undefined,
                is_anonymous: isAnonymous,
            });

            toast({ title: "Review submitted! Thank you for your feedback." });
            onSuccess?.();
        } catch (error) {
            toast({
                title: "Failed to submit review",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Rate Your Interview
                </CardTitle>
                <CardDescription>
                    {interviewerName
                        ? `How was your experience with ${interviewerName}?`
                        : "How was your interview experience?"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Star Rating */}
                <div className="space-y-2">
                    <Label>Overall Rating</Label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                            >
                                <Star
                                    className={`h-8 w-8 transition-colors ${star <= (hoverRating || rating)
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-muted-foreground/30'
                                        }`}
                                />
                            </button>
                        ))}
                        {rating > 0 && (
                            <span className="ml-2 text-lg font-semibold">{rating}/5</span>
                        )}
                    </div>
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                    <Label htmlFor="review">Your Review (optional)</Label>
                    <Textarea
                        id="review"
                        placeholder="Share your experience - what did you like? What could be improved?"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={4}
                    />
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                        {isAnonymous ? (
                            <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                            <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                            <Label htmlFor="anonymous" className="cursor-pointer">
                                Submit anonymously
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Your name won't be visible to the interviewer
                            </p>
                        </div>
                    </div>
                    <Switch
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={setIsAnonymous}
                    />
                </div>

                {/* Submit Button */}
                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={submitReview.isPending || rating === 0}
                >
                    <Send className="h-4 w-4 mr-2" />
                    {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
            </CardContent>
        </Card>
    );
}
