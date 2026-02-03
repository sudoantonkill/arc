import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSubmitFeedback, usePublishFeedback } from "@/hooks/useFeedback";
import { RATING_CATEGORIES } from "@/types/database";
import type { SubmitFeedbackInput, ResourceRecommendation } from "@/types/database";
import {
    Star,
    Plus,
    X,
    Send,
    Lightbulb,
    AlertTriangle,
    BookOpen,
    ThumbsUp,
    ThumbsDown,
    CheckCircle
} from "lucide-react";

interface FeedbackFormProps {
    bookingId: string;
    studentName?: string;
    interviewType?: string;
    onSuccess?: () => void;
}

export default function FeedbackForm({ bookingId, studentName, interviewType, onSuccess }: FeedbackFormProps) {
    const { toast } = useToast();
    const submitFeedback = useSubmitFeedback();
    const publishFeedback = usePublishFeedback();

    const [ratings, setRatings] = React.useState({
        technical_rating: 3,
        problem_solving_rating: 3,
        communication_rating: 3,
        soft_skills_rating: 3,
        confidence_rating: 3,
        body_language_rating: 3,
        overall_rating: 3,
    });

    const [strengths, setStrengths] = React.useState<string[]>([]);
    const [weaknesses, setWeaknesses] = React.useState<string[]>([]);
    const [newStrength, setNewStrength] = React.useState("");
    const [newWeakness, setNewWeakness] = React.useState("");
    const [improvementRoadmap, setImprovementRoadmap] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [wouldHire, setWouldHire] = React.useState<boolean | null>(null);
    const [hireLevel, setHireLevel] = React.useState("");
    const [resources, setResources] = React.useState<ResourceRecommendation[]>([]);
    const [publishImmediately, setPublishImmediately] = React.useState(true);

    const handleAddStrength = () => {
        if (newStrength.trim()) {
            setStrengths([...strengths, newStrength.trim()]);
            setNewStrength("");
        }
    };

    const handleAddWeakness = () => {
        if (newWeakness.trim()) {
            setWeaknesses([...weaknesses, newWeakness.trim()]);
            setNewWeakness("");
        }
    };

    const handleSubmit = async () => {
        if (strengths.length === 0 || weaknesses.length === 0) {
            toast({
                title: "Please add at least one strength and one area for improvement",
                variant: "destructive"
            });
            return;
        }

        if (!improvementRoadmap.trim()) {
            toast({
                title: "Please provide an improvement roadmap",
                variant: "destructive"
            });
            return;
        }

        const input: SubmitFeedbackInput = {
            booking_id: bookingId,
            ...ratings,
            strengths,
            weaknesses,
            improvement_roadmap: improvementRoadmap,
            interviewer_notes: notes || undefined,
            recommended_resources: resources,
            would_hire: wouldHire ?? undefined,
            hire_level: hireLevel || undefined,
        };

        try {
            const feedback = await submitFeedback.mutateAsync(input);

            if (publishImmediately) {
                await publishFeedback.mutateAsync(feedback.id);
                toast({ title: "Feedback submitted and published!" });
            } else {
                toast({ title: "Feedback saved as draft" });
            }

            onSuccess?.();
        } catch (error) {
            toast({
                title: "Failed to submit feedback",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    const averageRating = Object.values(ratings).reduce((a, b) => a + b, 0) / Object.keys(ratings).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Interview Feedback
                    </CardTitle>
                    <CardDescription>
                        {studentName && `Evaluating ${studentName}'s `}
                        {interviewType && `${interviewType} interview`}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Ratings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Performance Ratings</CardTitle>
                    <CardDescription>Rate each category from 1 (Poor) to 5 (Excellent)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {RATING_CATEGORIES.map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{label}</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold">{ratings[key as keyof typeof ratings]}</span>
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                className={`h-4 w-4 ${star <= ratings[key as keyof typeof ratings]
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-muted-foreground/30'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <Slider
                                value={[ratings[key as keyof typeof ratings]]}
                                onValueChange={([v]) => setRatings(r => ({ ...r, [key]: v }))}
                                min={1}
                                max={5}
                                step={1}
                                className="w-full"
                            />
                        </div>
                    ))}

                    {/* Overall Rating */}
                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold">Overall Rating</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-bold">{ratings.overall_rating}</span>
                                <span className="text-muted-foreground">/5</span>
                            </div>
                        </div>
                        <Slider
                            value={[ratings.overall_rating]}
                            onValueChange={([v]) => setRatings(r => ({ ...r, overall_rating: v }))}
                            min={1}
                            max={5}
                            step={1}
                            className="w-full"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ThumbsUp className="h-5 w-5 text-green-500" />
                            Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add a strength..."
                                value={newStrength}
                                onChange={(e) => setNewStrength(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddStrength()}
                            />
                            <Button size="icon" onClick={handleAddStrength}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {strengths.map((s, i) => (
                                <Badge key={i} variant="secondary" className="gap-1">
                                    {s}
                                    <button onClick={() => setStrengths(strengths.filter((_, j) => j !== i))}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ThumbsDown className="h-5 w-5 text-amber-500" />
                            Areas for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add an area for improvement..."
                                value={newWeakness}
                                onChange={(e) => setNewWeakness(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddWeakness()}
                            />
                            <Button size="icon" onClick={handleAddWeakness}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {weaknesses.map((w, i) => (
                                <Badge key={i} variant="outline" className="gap-1">
                                    {w}
                                    <button onClick={() => setWeaknesses(weaknesses.filter((_, j) => j !== i))}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Improvement Roadmap */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Lightbulb className="h-5 w-5 text-blue-500" />
                        Improvement Roadmap
                    </CardTitle>
                    <CardDescription>
                        Provide actionable guidance on how the student can improve
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="E.g., Focus on practicing time complexity analysis. Start with easy LeetCode problems and gradually move to medium. Review Big O notation concepts..."
                        value={improvementRoadmap}
                        onChange={(e) => setImprovementRoadmap(e.target.value)}
                        rows={5}
                    />
                </CardContent>
            </Card>

            {/* Hiring Assessment */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle className="h-5 w-5 text-purple-500" />
                        Hiring Assessment
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Would you recommend hiring this candidate?</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={wouldHire === true ? "default" : "outline"}
                                onClick={() => setWouldHire(true)}
                            >
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Yes
                            </Button>
                            <Button
                                variant={wouldHire === false ? "default" : "outline"}
                                onClick={() => setWouldHire(false)}
                            >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Not Yet
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label className="mb-2 block">Suggested level (optional)</Label>
                        <div className="flex flex-wrap gap-2">
                            {['not_ready', 'junior', 'mid', 'senior'].map(level => (
                                <Button
                                    key={level}
                                    variant={hireLevel === level ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setHireLevel(level)}
                                >
                                    {level.replace('_', ' ')}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Private Notes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5" />
                        Private Notes
                    </CardTitle>
                    <CardDescription>
                        These notes are only visible to you, not the student
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="Any additional observations or notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                    />
                </CardContent>
            </Card>

            {/* Submit */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={publishImmediately}
                                onCheckedChange={setPublishImmediately}
                            />
                            <Label>Publish immediately to student</Label>
                        </div>
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={submitFeedback.isPending}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {publishImmediately ? 'Submit & Publish' : 'Save Draft'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
