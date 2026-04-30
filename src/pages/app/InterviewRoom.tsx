import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBooking, useUpdateBookingStatus } from "@/hooks/useBookings";
import { useToast } from "@/hooks/use-toast";
import CodeEditor from "@/components/interview/CodeEditor";
import ChatPanel from "@/components/interview/ChatPanel";
import VideoPanel from "@/components/interview/VideoPanel";
import InterviewControls from "@/components/interview/InterviewControls";
import FeedbackForm from "@/components/interviewer/FeedbackForm";
import StudentReviewForm from "@/components/student/StudentReviewForm";
import { useSession } from "@/hooks/useSession";
import { useMyRoles } from "@/hooks/useMyRoles";
import {
    Video,
    Code,
    MessageSquare,
    Clock,
    ArrowLeft,
    Loader2,
    AlertCircle,
    CheckCircle
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function InterviewRoom() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session } = useSession();
    const { roles } = useMyRoles(true);

    const { data: booking, isLoading, error } = useBooking(bookingId ?? '');
    const updateStatus = useUpdateBookingStatus();

    const [elapsedTime, setElapsedTime] = React.useState(0);
    const [isInterviewStarted, setIsInterviewStarted] = React.useState(false);
    const [isInterviewEnded, setIsInterviewEnded] = React.useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = React.useState(false);

    const [searchParams] = useSearchParams();
    const activeRole = searchParams.get('role');

    // Check roles based on this specific booking and the URL ?role parameter
    // This allows users testing with dual-role accounts to force a specific view
    const isInterviewer = activeRole === 'interviewer' || (booking?.interviewer_id === session?.user.id && activeRole !== 'student');
    const isStudent = activeRole === 'student' || (booking?.student_id === session?.user.id && activeRole !== 'interviewer');

    // Sync from database status
    React.useEffect(() => {
        if (booking?.status === 'in_progress') {
            setIsInterviewStarted(true);
        } else if (booking?.status === 'completed') {
            setIsInterviewEnded(true);
        }
    }, [booking?.status]);

    // Timer
    React.useEffect(() => {
        if (!isInterviewStarted || isInterviewEnded) return;

        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isInterviewStarted, isInterviewEnded]);

    const handleStartInterview = async () => {
        if (!bookingId) return;

        try {
            await updateStatus.mutateAsync({ bookingId, status: 'in_progress' });
            setIsInterviewStarted(true);
            toast({ title: "Interview started!" });
        } catch (error) {
            toast({ title: "Failed to start interview", variant: "destructive" });
        }
    };

    const handleEndInterview = async () => {
        if (!bookingId) return;

        try {
            await updateStatus.mutateAsync({ bookingId, status: 'completed' });
            setIsInterviewEnded(true);
            toast({
                title: "Interview completed!",
                description: isInterviewer ? "Don't forget to submit feedback." : "Feedback will be available soon."
            });
        } catch (error) {
            toast({ title: "Failed to end interview", variant: "destructive" });
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading interview room...</p>
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                        <h2 className="text-lg font-semibold mb-2">Interview Not Found</h2>
                        <p className="text-muted-foreground mb-4">
                            This interview session doesn't exist or you don't have access.
                        </p>
                        <Button onClick={() => navigate(-1)}>Go Back</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isInterviewEnded) {
        // Show inline feedback forms for the respective roles
        if (showFeedbackForm && isInterviewer && bookingId) {
            return (
                <div className="min-h-screen bg-background py-8">
                    <div className="max-w-3xl mx-auto px-4">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Submit Interview Feedback</h1>
                                <p className="text-muted-foreground">Duration: {formatTime(elapsedTime)}</p>
                            </div>
                            <Button variant="outline" onClick={() => navigate('/app/interviewer')}>
                                Skip for now
                            </Button>
                        </div>
                        <ScrollArea className="h-[calc(100vh-200px)]">
                            <FeedbackForm
                                bookingId={bookingId}
                                studentName={booking?.student_profile?.education ?? 'Student'}
                                interviewType={booking?.interview_type}
                                onSuccess={() => navigate('/app/interviewer')}
                            />
                        </ScrollArea>
                    </div>
                </div>
            );
        }

        if (showFeedbackForm && isStudent && bookingId && booking) {
            return (
                <div className="min-h-screen bg-background py-8">
                    <div className="max-w-xl mx-auto px-4">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold">Interview Completed!</h1>
                            <p className="text-muted-foreground">Duration: {formatTime(elapsedTime)}</p>
                        </div>
                        <StudentReviewForm
                            bookingId={bookingId}
                            interviewerId={booking.interviewer_id}
                            interviewerName={booking.interviewer_profile?.company_background}
                            onSuccess={() => navigate('/app/student')}
                        />
                        <Button
                            variant="ghost"
                            className="w-full mt-4"
                            onClick={() => navigate('/app/student')}
                        >
                            Skip for now
                        </Button>
                    </div>
                </div>
            );
        }

        // Default completion screen with option to show forms
        return (
            <div className="h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Interview Completed!</h2>
                        <p className="text-muted-foreground mb-4">
                            {isInterviewer
                                ? "Please submit your feedback to help the student improve."
                                : "Great job! Would you like to rate your experience?"
                            }
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">
                            Duration: {formatTime(elapsedTime)}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => setShowFeedbackForm(true)}>
                                {isInterviewer ? 'Submit Feedback' : 'Rate Interview'}
                            </Button>
                            <Button variant="outline" onClick={() => navigate(isInterviewer ? '/app/interviewer' : '/app/student')}>
                                Back to Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="border-b px-4 py-3 flex items-center justify-between bg-card">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Exit
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <div>
                        <h1 className="font-semibold">{booking.interview_type} Interview</h1>
                        <p className="text-xs text-muted-foreground">
                            {booking.target_company && `${booking.target_company} • `}
                            {format(new Date(booking.scheduled_at), 'h:mm a')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isInterviewStarted && (
                        <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                            <Clock className="h-4 w-4 mr-2" />
                            {formatTime(elapsedTime)}
                        </Badge>
                    )}

                    {!isInterviewStarted ? (
                        isInterviewer ? (
                            <Button onClick={handleStartInterview} disabled={updateStatus.isPending}>
                                Start Interview
                            </Button>
                        ) : (
                            <Badge variant="outline" className="px-3 py-1">
                                Waiting for interviewer to start...
                            </Badge>
                        )
                    ) : (
                        <Button variant="destructive" onClick={handleEndInterview} disabled={updateStatus.isPending || (isStudent && !isInterviewer)}>
                            End Interview
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Video Panel */}
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="h-full flex flex-col">
                        <VideoPanel
                            bookingId={bookingId ?? ''}
                            isStarted={isInterviewStarted}
                            isInterviewer={isInterviewer}
                        />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Code & Chat Panel */}
                <ResizablePanel defaultSize={60} minSize={40}>
                    <ResizablePanelGroup direction="vertical">
                        {/* Code Editor */}
                        <ResizablePanel defaultSize={70} minSize={30}>
                            <CodeEditor
                                bookingId={bookingId ?? ''}
                                readOnly={!isInterviewStarted}
                            />
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Chat */}
                        <ResizablePanel defaultSize={30} minSize={20}>
                            <ChatPanel bookingId={bookingId ?? ''} />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
