import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpcomingBookings, useCancelBooking } from "@/hooks/useBookings";
import { formatCents } from "@/hooks/useWallet";
import { Calendar, Clock, User, Video, X, AlertCircle, ExternalLink } from "lucide-react";
import { format, differenceInMinutes, differenceInHours, differenceInDays, isBefore, addHours } from "date-fns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function UpcomingSessions() {
    const { toast } = useToast();
    const { data: bookings = [], isLoading } = useUpcomingBookings('student');
    const cancelBooking = useCancelBooking();

    const handleCancel = async (bookingId: string) => {
        try {
            await cancelBooking.mutateAsync({ bookingId });
            toast({ title: "Booking cancelled" });
        } catch (error) {
            toast({
                title: "Failed to cancel",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-24 bg-muted rounded-lg" />
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
                    <Calendar className="h-5 w-5" />
                    Upcoming Sessions
                </CardTitle>
                <CardDescription>
                    Your scheduled mock interviews
                </CardDescription>
            </CardHeader>
            <CardContent>
                {bookings.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="font-medium">No upcoming sessions</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Browse interviewers to book your first mock interview
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map(booking => {
                            const scheduledDate = new Date(booking.scheduled_at);
                            const now = new Date();
                            const canJoin = differenceInMinutes(scheduledDate, now) <= 15;
                            const canCancel = differenceInHours(scheduledDate, now) >= 24;
                            const timeUntil = getTimeUntil(scheduledDate);

                            return (
                                <div
                                    key={booking.id}
                                    className={`p-4 rounded-lg border ${canJoin ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-lg">{booking.interview_type} Interview</span>
                                                {booking.target_company && (
                                                    <Badge variant="outline">{booking.target_company}</Badge>
                                                )}
                                                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                                    {booking.status}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(scheduledDate, 'EEEE, MMMM d')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {format(scheduledDate, 'h:mm a')} ({booking.duration_minutes} min)
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-4 w-4" />
                                                    {booking.interviewer_profile?.company_background || 'Interviewer'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="gap-1">
                                                    {canJoin ? (
                                                        <>
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                            </span>
                                                            Ready to join
                                                        </>
                                                    ) : (
                                                        <>Starts {timeUntil}</>
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {canCancel && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <X className="h-4 w-4 mr-1" />
                                                            Cancel
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Cancel this interview?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will cancel your booking. You will receive a full refund if applicable.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Keep booking</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleCancel(booking.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Yes, cancel
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}

                                            {booking.status === 'confirmed' && (
                                                <Button
                                                    asChild
                                                    disabled={!canJoin}
                                                    className={canJoin ? 'bg-green-600 hover:bg-green-700' : ''}
                                                >
                                                    <Link to={`/app/interview/${booking.id}`}>
                                                        <Video className="h-4 w-4 mr-2" />
                                                        {canJoin ? 'Join Now' : 'Join Room'}
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {!canCancel && differenceInHours(scheduledDate, now) < 24 && differenceInHours(scheduledDate, now) > 0 && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                                            <AlertCircle className="h-4 w-4" />
                                            Cancellations within 24 hours may not be eligible for refund
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getTimeUntil(date: Date): string {
    const now = new Date();
    const diffMins = differenceInMinutes(date, now);
    const diffHours = differenceInHours(date, now);
    const diffDays = differenceInDays(date, now);

    if (diffMins < 0) return 'now';
    if (diffMins < 60) return `in ${diffMins} min`;
    if (diffHours < 24) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
}
