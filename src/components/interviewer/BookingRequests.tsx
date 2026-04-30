import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBookings, useConfirmBookingTime, useUpdateBookingStatus } from "@/hooks/useBookings";
import { useCreateDailyRoom } from "@/hooks/useDaily";
import { Calendar, Clock, User, IndianRupee, CheckCircle, XCircle, Briefcase, Video, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { ProposedTimeSlot } from "@/types/database";

export default function BookingRequests() {
    const { toast } = useToast();
    const { data: allBookings = [], isLoading } = useBookings({ role: 'interviewer' });
    const confirmBookingTime = useConfirmBookingTime();
    const updateStatus = useUpdateBookingStatus();
    const createDailyRoom = useCreateDailyRoom();

    const pendingBookings = allBookings.filter(b => b.status === 'pending');
    const confirmedBookings = allBookings.filter(b => ['confirmed', 'in_progress'].includes(b.status));

    const handleConfirmTime = async (booking: any, scheduledAt: string) => {
        try {
            // Automatically create a Jitsi Meet room for this booking
            const roomData = await createDailyRoom.mutateAsync({
                bookingId: booking.id,
                scheduledAt,
                durationMinutes: booking.duration_minutes || 60,
            });

            await confirmBookingTime.mutateAsync({
                bookingId: booking.id,
                scheduledAt,
                meetingLink: roomData.roomUrl,
            });
            toast({ title: "Booking confirmed!", description: "Video room created and student notified." });
        } catch (error) {
            toast({ title: "Failed to confirm booking", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
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
                        Review requests and pick your preferred time from the student's proposed slots
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingBookings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No pending requests</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {pendingBookings.map(booking => {
                                const proposedTimes: ProposedTimeSlot[] = booking.proposed_times ?? [];

                                return (
                                    <div
                                        key={booking.id}
                                        className="p-5 rounded-lg border bg-card space-y-4"
                                    >
                                        {/* Student Info */}
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-semibold text-lg">
                                                        {booking.student_profile?.first_name
                                                            ? `${(booking.student_profile as any).first_name} ${(booking.student_profile as any).last_name ?? ''}`
                                                            : booking.student_profile?.education || 'Student'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="h-4 w-4" />
                                                        {booking.interview_type}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {booking.duration_minutes} min
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <IndianRupee className="h-4 w-4" />
                                                        ₹{(booking.interviewer_amount_cents / 100).toFixed(0)}
                                                    </span>
                                                    {booking.payment_status === 'completed' && (
                                                        <Badge variant="default" className="bg-green-600 text-xs">
                                                            Paid
                                                        </Badge>
                                                    )}
                                                </div>
                                                {booking.target_company && (
                                                    <Badge variant="outline">{booking.target_company}</Badge>
                                                )}
                                                {booking.student_notes && (
                                                    <p className="text-sm text-muted-foreground mt-2 italic">
                                                        "{booking.student_notes}"
                                                    </p>
                                                )}
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReject(booking.id)}
                                                disabled={updateStatus.isPending}
                                                className="shrink-0"
                                            >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Decline
                                            </Button>
                                        </div>

                                        {/* Proposed Time Slots */}
                                        {proposedTimes.length > 0 ? (
                                            <div className="space-y-3">
                                                <Label className="text-sm font-medium">
                                                    Student's Proposed Times — pick one to confirm:
                                                </Label>
                                                <div className="grid gap-2 sm:grid-cols-3">
                                                    {proposedTimes.map((slot, index) => {
                                                        const slotDate = new Date(`${slot.date}T${slot.time}:00`);
                                                        return (
                                                            <Button
                                                                key={index}
                                                                variant="outline"
                                                                className="h-auto py-3 flex flex-col gap-1 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                                                                onClick={() => handleConfirmTime(booking, slotDate.toISOString())}
                                                                disabled={confirmBookingTime.isPending}
                                                            >
                                                                <span className="font-medium">
                                                                    {format(new Date(slot.date), 'EEE, MMM d')}
                                                                </span>
                                                                <span className="text-sm text-muted-foreground">{slot.time}</span>
                                                                <span className="text-xs text-green-600 mt-1">
                                                                    <CheckCircle className="h-3 w-3 inline mr-1" />
                                                                    Select
                                                                </span>
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm text-muted-foreground">
                                                    <Calendar className="h-4 w-4 inline mr-1" />
                                                    {format(new Date(booking.scheduled_at), 'MMM d, yyyy')} at {format(new Date(booking.scheduled_at), 'h:mm a')}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleConfirmTime(booking, booking.scheduled_at)}
                                                    disabled={confirmBookingTime.isPending}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Confirm
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
                                        <div className="text-sm text-muted-foreground">
                                            <User className="h-3 w-3 inline mr-1" />
                                            {booking.student_profile?.first_name
                                                ? `${(booking.student_profile as any).first_name} ${(booking.student_profile as any).last_name ?? ''}`
                                                : booking.student_profile?.education || 'Student'}
                                        </div>
                                    </div>
                                    <Button variant="default" asChild className="bg-green-600 hover:bg-green-700">
                                        <Link to={`/app/interview/${booking.id}?role=interviewer`}>
                                            <Video className="h-4 w-4 mr-2" />
                                            Join Now
                                        </Link>
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
