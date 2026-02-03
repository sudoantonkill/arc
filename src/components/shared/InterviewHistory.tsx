import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePastBookings } from "@/hooks/useBookings";
import { formatCents } from "@/hooks/useWallet";
import {
    History,
    Calendar,
    Star,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Eye
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface InterviewHistoryProps {
    role: 'student' | 'interviewer';
}

export default function InterviewHistory({ role }: InterviewHistoryProps) {
    const { data: bookings = [], isLoading } = usePastBookings(role);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
            case 'cancelled':
                return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
            case 'no_show':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> No Show</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'no_show');

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Interview History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-muted rounded-lg" />
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
                    <History className="h-5 w-5" />
                    Interview History
                </CardTitle>
                <CardDescription>
                    Your past interview sessions
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="completed">
                    <TabsList className="mb-4">
                        <TabsTrigger value="completed" className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Completed ({completedBookings.length})
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="gap-2">
                            <XCircle className="h-4 w-4" />
                            Cancelled ({cancelledBookings.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="completed">
                        {completedBookings.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="font-medium">No completed interviews</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {role === 'student'
                                        ? "Your completed interviews will appear here"
                                        : "Interviews you've conducted will appear here"
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {completedBookings.map(booking => (
                                    <div
                                        key={booking.id}
                                        className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{booking.interview_type} Interview</span>
                                                    {getStatusBadge(booking.status)}
                                                    {booking.target_company && (
                                                        <Badge variant="outline">{booking.target_company}</Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {format(new Date(booking.scheduled_at), 'MMM d, yyyy')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {booking.duration_minutes} min
                                                    </span>
                                                    {role === 'student' && (
                                                        <span>
                                                            with {booking.interviewer_profile?.company_background || 'Interviewer'}
                                                        </span>
                                                    )}
                                                    {role === 'interviewer' && (
                                                        <span>
                                                            {booking.student_profile?.education || 'Student'}
                                                        </span>
                                                    )}
                                                </div>
                                                {booking.feedback && (
                                                    <div className="flex items-center gap-2">
                                                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                        <span className="text-sm font-medium">
                                                            {booking.feedback.overall_rating}/5
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Feedback submitted
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {role === 'student' && booking.feedback && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link to={`/app/student?tab=reports`}>
                                                            <FileText className="h-4 w-4 mr-1" />
                                                            View Report
                                                        </Link>
                                                    </Button>
                                                )}
                                                {role === 'interviewer' && !booking.feedback && (
                                                    <Button size="sm" asChild>
                                                        <Link to={`/app/interviewer?booking=${booking.id}`}>
                                                            <FileText className="h-4 w-4 mr-1" />
                                                            Submit Feedback
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="cancelled">
                        {cancelledBookings.length === 0 ? (
                            <div className="text-center py-12">
                                <XCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="font-medium">No cancelled interviews</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cancelledBookings.map(booking => (
                                    <div
                                        key={booking.id}
                                        className="p-4 rounded-lg border"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{booking.interview_type} Interview</span>
                                                    {getStatusBadge(booking.status)}
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {format(new Date(booking.scheduled_at), 'MMM d, yyyy')}
                                                    </span>
                                                    {role === 'student' && (
                                                        <span>
                                                            with {booking.interviewer_profile?.company_background || 'Interviewer'}
                                                        </span>
                                                    )}
                                                </div>
                                                {booking.cancellation_reason && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Reason: {booking.cancellation_reason}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right text-sm text-muted-foreground">
                                                {booking.payment_status === 'refunded' && (
                                                    <Badge variant="outline">Refunded</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
