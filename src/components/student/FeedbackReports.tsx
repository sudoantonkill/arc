import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useMyFeedbackReports, calculateAverageRating } from "@/hooks/useFeedback";
import { RATING_CATEGORIES } from "@/types/database";
import type { InterviewFeedback } from "@/types/database";
import {
    Star,
    TrendingUp,
    TrendingDown,
    Target,
    Lightbulb,
    BookOpen,
    Calendar,
    ChevronRight,
    FileText,
    Award,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function FeedbackReports() {
    const { data: feedbackReports = [], isLoading } = useMyFeedbackReports();
    const [selectedReport, setSelectedReport] = React.useState<(InterviewFeedback & { booking: any }) | null>(null);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Interview Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-muted rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (selectedReport) {
        return (
            <FeedbackReportDetail
                feedback={selectedReport}
                onBack={() => setSelectedReport(null)}
            />
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Interview Reports
                </CardTitle>
                <CardDescription>
                    Review feedback from your mock interviews to track your progress
                </CardDescription>
            </CardHeader>
            <CardContent>
                {feedbackReports.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="font-medium">No reports yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Complete an interview to receive your first feedback report
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbackReports.map(report => {
                            const avgRating = calculateAverageRating(report);
                            return (
                                <div
                                    key={report.id}
                                    className="p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{report.booking.interview_type} Interview</span>
                                                <Badge variant={avgRating >= 4 ? "default" : avgRating >= 3 ? "secondary" : "outline"}>
                                                    {avgRating.toFixed(1)} / 5
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>{format(new Date(report.booking.scheduled_at), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface FeedbackReportDetailProps {
    feedback: InterviewFeedback & { booking: { scheduled_at: string; interview_type: string } };
    onBack: () => void;
}

function FeedbackReportDetail({ feedback, onBack }: FeedbackReportDetailProps) {
    const avgRating = calculateAverageRating(feedback);

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={onBack}>
                ← Back to Reports
            </Button>

            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl">{feedback.booking.interview_type} Interview Report</CardTitle>
                            <CardDescription>
                                {format(new Date(feedback.booking.scheduled_at), 'MMMM d, yyyy')}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2">
                                <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                                <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
                                <span className="text-muted-foreground">/ 5</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Hiring Assessment */}
            {feedback.would_hire !== null && (
                <Card className={feedback.would_hire ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'}>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${feedback.would_hire ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                <Award className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">
                                    {feedback.would_hire ? 'Hire Recommendation' : 'Not Ready Yet'}
                                </p>
                                {feedback.hire_level && (
                                    <p className="text-muted-foreground">
                                        Suggested level: <span className="font-medium capitalize">{feedback.hire_level.replace('_', ' ')}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Rating Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Performance Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {RATING_CATEGORIES.map(({ key, label }) => {
                        const rating = feedback[key as keyof typeof feedback] as number | null;
                        if (rating === null || rating === undefined) return null;

                        return (
                            <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span>{label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{rating}/5</span>
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star
                                                    key={star}
                                                    className={`h-3 w-3 ${star <= rating
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-muted-foreground/30'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Progress value={(rating / 5) * 100} className="h-2" />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                            <TrendingUp className="h-5 w-5" />
                            Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feedback.strengths.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No strengths noted</p>
                        ) : (
                            <ul className="space-y-2">
                                {feedback.strengths.map((strength, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="text-green-500 mt-0.5">✓</span>
                                        {strength}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <TrendingDown className="h-5 w-5" />
                            Areas to Improve
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feedback.weaknesses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No areas noted</p>
                        ) : (
                            <ul className="space-y-2">
                                {feedback.weaknesses.map((weakness, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="text-amber-500 mt-0.5">!</span>
                                        {weakness}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Improvement Roadmap */}
            {feedback.improvement_roadmap && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-blue-500" />
                            Improvement Roadmap
                        </CardTitle>
                        <CardDescription>
                            Your personalized action plan to improve
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap">{feedback.improvement_roadmap}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AI Summary */}
            {feedback.ai_summary && (
                <Card className="border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="relative flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-primary/20 items-center justify-center text-xs">AI</span>
                            </span>
                            AI-Generated Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{feedback.ai_summary}</p>
                    </CardContent>
                </Card>
            )}

            {/* Recommended Resources */}
            {feedback.recommended_resources && feedback.recommended_resources.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Recommended Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {feedback.recommended_resources.map((resource, i) => (
                                <a
                                    key={i}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs">
                                            {resource.type}
                                        </Badge>
                                    </div>
                                    <p className="font-medium text-sm">{resource.title}</p>
                                    {resource.description && (
                                        <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    )}
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
