import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpcomingBookings, useUpdateBookingStatus } from "@/hooks/useBookings";
import { formatCents } from "@/hooks/useWallet";
import { Calendar, Clock, User, DollarSign, CheckCircle, XCircle, Briefcase } from "lucide-react";
import { format } from "date-fns";

export default function BookingRequests() {
    const { toast } = useToast();
    const { data: bookings = [], isLoading } = useUpcomingBookings('interviewer');
    const updateStatus = useUpdateBookingStatus();

    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

    const handleAccept = async (bookingId: string) => {
        try {
            await updateStatus.mutateAsync({ bookingId, status: 'confirmed' });
            toast({ title: "Booking confirmed!", description: "The student will be notified." });
        } catch (error) {
            toast({ title: "Failed to confirm booking", variant: "destructive" });
        }
    };

    const handleReject = async (bookingId: string) => {
        try {
            await updateStatus.mutateAsync({
                bookingId,
                status: 'cancelled',
                cancellationReason: 'Rejected by interviewer'
            });
            toast({ title: "Booking rejected" });
        } catch (error) {
            toast({ title: "Failed to reject booking", variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Booking Requests</CardTitle>
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
        <div className="space-y-6">
            {/* Pending Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Pending Requests
                        {pendingBookings.length > 0 && (
                            <Badge variant="secondary">{pendingBookings.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Review and accept or decline incoming interview requests
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingBookings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No pending requests</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingBookings.map(booking => (
                                <div
                                    key={booking.id}
                                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {booking.student_profile?.education || 'Student'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(booking.scheduled_at), 'MMM d, yyyy')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {format(new Date(booking.scheduled_at), 'h:mm a')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="h-4 w-4" />
                                                {booking.interview_type}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="h-4 w-4" />
                                                {formatCents(booking.interviewer_amount_cents)}
                                            </span>
                                        </div>
                                        {booking.target_company && (
                                            <Badge variant="outline">{booking.target_company}</Badge>
                                        )}
                                        {booking.student_notes && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Note: {booking.student_notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReject(booking.id)}
                                            disabled={updateStatus.isPending}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Decline
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAccept(booking.id)}
                                            disabled={updateStatus.isPending}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmed Upcoming */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Upcoming Interviews
                        {confirmedBookings.length > 0 && (
                            <Badge>{confirmedBookings.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Your confirmed upcoming interview sessions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {confirmedBookings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No upcoming interviews</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {confirmedBookings.map(booking => (
                                <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-4 rounded-lg border"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {booking.interview_type} Interview
                                            </span>
                                            {booking.target_company && (
                                                <Badge variant="secondary">{booking.target_company}</Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-4 text-sm text-muted-foreground">
                                            <span>{format(new Date(booking.scheduled_at), 'MMM d, yyyy • h:mm a')}</span>
                                            <span>{booking.duration_minutes} min</span>
                                        </div>
                                    </div>
                                    <Button variant="default" asChild>
                                        <a href={`/app/interview/${booking.id}`}>Join Room</a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
