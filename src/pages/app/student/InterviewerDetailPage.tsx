import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInterviewer, useInterviewerAvailability } from "@/hooks/useInterviewers";
import { useCreateBooking } from "@/hooks/useBookings";
import { useRazorpayCheckout, useRazorpayConfig } from "@/hooks/usePayments";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/use-toast";
import { INTERVIEW_TYPES, TARGET_COMPANIES, DAYS_OF_WEEK, ProposedTimeSlot } from "@/types/database";
import {
    Star,
    Briefcase,
    MapPin,
    Clock,
    ArrowLeft,
    Calendar as CalendarIcon,
    CheckCircle,
    Loader2,
    CreditCard,
    Plus,
    X
} from "lucide-react";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay, parse } from "date-fns";

export default function InterviewerDetailPage() {
    const { interviewerId } = useParams<{ interviewerId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session } = useSession();

    const { data: interviewer, isLoading } = useInterviewer(interviewerId ?? '');
    const { data: availability = [] } = useInterviewerAvailability(interviewerId ?? '');
    const createBooking = useCreateBooking();
    const { data: razorpayConfig } = useRazorpayConfig();
    const { openCheckout, isLoading: isPaymentLoading } = useRazorpayCheckout();

    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = React.useState<string>("");
    const [proposedSlots, setProposedSlots] = React.useState<ProposedTimeSlot[]>([]);
    const [interviewType, setInterviewType] = React.useState<string>("");
    const [targetCompany, setTargetCompany] = React.useState<string>("");
    const [duration, setDuration] = React.useState<string>("60");
    const [notes, setNotes] = React.useState<string>("");
    const [step, setStep] = React.useState<'details' | 'payment' | 'confirm'>('details');
    const [createdBookingId, setCreatedBookingId] = React.useState<string>("");

    // Get available times for selected date
    const availableTimesForDate = React.useMemo(() => {
        if (!selectedDate) return [];

        const dayOfWeek = selectedDate.getDay();
        const daySlots = availability.filter(slot => slot.day_of_week === dayOfWeek && slot.is_active);

        if (daySlots.length === 0) return [];

        const times: string[] = [];
        daySlots.forEach(slot => {
            const startHour = parseInt(slot.start_time.slice(0, 2));
            const endHour = parseInt(slot.end_time.slice(0, 2));

            for (let hour = startHour; hour < endHour; hour++) {
                times.push(`${hour.toString().padStart(2, '0')}:00`);
                times.push(`${hour.toString().padStart(2, '0')}:30`);
            }
        });

        // Filter out past times for today
        const now = new Date();
        if (startOfDay(selectedDate).getTime() === startOfDay(now).getTime()) {
            return times.filter(time => {
                const [h, m] = time.split(':').map(Number);
                const timeDate = setMinutes(setHours(selectedDate, h), m);
                return !isBefore(timeDate, now);
            });
        }

        return times;
    }, [selectedDate, availability]);

    // Get days with availability for calendar
    const availableDays = React.useMemo(() => {
        return availability
            .filter(slot => slot.is_active)
            .map(slot => slot.day_of_week);
    }, [availability]);

    // Add a proposed time slot
    const addProposedSlot = () => {
        if (!selectedDate || !selectedTime) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        // Check if already added
        if (proposedSlots.some(s => s.date === dateStr && s.time === selectedTime)) {
            toast({ title: "This time is already proposed", variant: "destructive" });
            return;
        }
        if (proposedSlots.length >= 3) {
            toast({ title: "Maximum 3 time slots allowed", variant: "destructive" });
            return;
        }
        setProposedSlots([...proposedSlots, { date: dateStr, time: selectedTime }]);
        setSelectedTime("");
    };

    const removeProposedSlot = (index: number) => {
        setProposedSlots(proposedSlots.filter((_, i) => i !== index));
    };

    const handleBook = async () => {
        if (!interviewerId || proposedSlots.length === 0 || !interviewType) {
            toast({ title: "Please fill all required fields", variant: "destructive" });
            return;
        }

        // Use the first proposed time as the primary scheduled_at
        const firstSlot = proposedSlots[0];
        const [hours, minutes] = firstSlot.time.split(':').map(Number);
        const scheduledDate = new Date(firstSlot.date);
        const scheduledAt = setMinutes(setHours(scheduledDate, hours), minutes);

        try {
            const booking = await createBooking.mutateAsync({
                interviewer_id: interviewerId,
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: parseInt(duration),
                interview_type: interviewType,
                target_company: targetCompany || undefined,
                student_notes: notes || undefined,
                proposed_times: proposedSlots,
            });

            setCreatedBookingId(booking.id);

            // If Razorpay is configured, proceed to payment
            if (razorpayConfig?.isConfigured && session) {
                const userEmail = session.user.email ?? '';
                const userName = session.user.user_metadata?.full_name ?? session.user.email ?? '';

                openCheckout(
                    {
                        bookingId: booking.id,
                        interviewerId: interviewerId,
                        amountPaise: booking.total_amount_cents,
                        interviewType: interviewType,
                        scheduledAt: scheduledAt.toISOString(),
                        studentName: userName,
                        studentEmail: userEmail,
                    },
                    () => {
                        toast({
                            title: "Payment successful!",
                            description: "Your booking request has been sent to the interviewer."
                        });
                        setStep('confirm');
                    },
                    (err) => {
                        toast({
                            title: "Payment failed",
                            description: err.message || "Please try again",
                            variant: "destructive",
                        });
                        // Booking is still created with pending payment status
                        setStep('confirm');
                    }
                );
            } else {
                // No payment configured — just confirm
                toast({
                    title: "Booking request sent!",
                    description: "The interviewer will confirm your booking soon."
                });
                setStep('confirm');
            }
        } catch (error) {
            toast({
                title: "Booking failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container py-10 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!interviewer) {
        return (
            <div className="container py-10">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-lg font-medium">Interviewer not found</p>
                        <Button variant="link" onClick={() => navigate(-1)}>
                            Go back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hourlyRate = (interviewer.hourly_rate_cents ?? 50000) / 100;
    const sessionCost = (hourlyRate * parseInt(duration)) / 60;

    if (step === 'confirm') {
        return (
            <div className="container py-10 max-w-xl mx-auto">
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Booking Request Sent!</h2>
                        <p className="text-muted-foreground mb-4">
                            Your interview request has been sent to the interviewer with
                            {proposedSlots.length > 1 ? ` ${proposedSlots.length} proposed times` : ' your proposed time'}.
                        </p>
                        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-left">
                            <p className="font-medium mb-2">Your proposed times:</p>
                            {proposedSlots.map((slot, i) => (
                                <p key={i} className="text-muted-foreground">
                                    • {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')} at {slot.time}
                                </p>
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            The interviewer will pick their preferred time from your options.
                            You'll be notified once confirmed.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button variant="outline" onClick={() => navigate('/app/student')}>
                                Back to Dashboard
                            </Button>
                            <Button onClick={() => { setStep('details'); setProposedSlots([]); setSelectedDate(undefined); setSelectedTime(''); }}>
                                Book Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container py-10">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Interviewers
            </Button>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Interviewer Profile */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl font-semibold">
                                        {interviewer.company_background?.slice(0, 2).toUpperCase() || 'IN'}
                                    </AvatarFallback>
                                </Avatar>
                                <h1 className="text-2xl font-bold mt-4">
                                    {interviewer.company_background || 'Interviewer'}
                                </h1>
                                <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{interviewer.years_experience ?? 0}+ years experience</span>
                                </div>
                                {interviewer.average_rating > 0 && (
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                        <span className="font-semibold">{interviewer.average_rating.toFixed(1)}</span>
                                        <span className="text-muted-foreground">({interviewer.review_count} reviews)</span>
                                    </div>
                                )}
                            </div>

                            <Separator className="my-6" />

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2">About</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {interviewer.bio || 'No bio provided'}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-medium mb-2">Specialties</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {interviewer.specialties?.map(specialty => (
                                            <Badge key={specialty} variant="secondary">
                                                {specialty}
                                            </Badge>
                                        )) || <span className="text-sm text-muted-foreground">Not specified</span>}
                                    </div>
                                </div>

                                {interviewer.timezone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>{interviewer.timezone}</span>
                                    </div>
                                )}
                            </div>

                            <Separator className="my-6" />

                            <div className="text-center">
                                <p className="text-3xl font-bold text-primary">₹{hourlyRate}</p>
                                <p className="text-sm text-muted-foreground">per hour</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Booking Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Book an Interview
                            </CardTitle>
                            <CardDescription>
                                Propose up to 3 time slots — the interviewer will pick their preferred one
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Date Picker */}
                            <div>
                                <Label className="mb-3 block">Select Date</Label>
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    disabled={(date) => {
                                        const dayOfWeek = date.getDay();
                                        const isPast = isBefore(date, startOfDay(new Date()));
                                        const isAvailable = availableDays.includes(dayOfWeek);
                                        return isPast || !isAvailable;
                                    }}
                                    className="rounded-md border mx-auto"
                                />
                            </div>

                            {/* Time Selection */}
                            {selectedDate && (
                                <div>
                                    <Label className="mb-3 block">Select Time</Label>
                                    {availableTimesForDate.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No available times for this date
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {availableTimesForDate.map(time => (
                                                    <Button
                                                        key={time}
                                                        variant={selectedTime === time ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setSelectedTime(time)}
                                                    >
                                                        {time}
                                                    </Button>
                                                ))}
                                            </div>

                                            {selectedTime && (
                                                <Button
                                                    onClick={addProposedSlot}
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={proposedSlots.length >= 3}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add {format(selectedDate, 'MMM d')} at {selectedTime}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Proposed Slots Display */}
                            {proposedSlots.length > 0 && (
                                <div>
                                    <Label className="mb-3 block">
                                        Proposed Times ({proposedSlots.length}/3)
                                    </Label>
                                    <div className="space-y-2">
                                        {proposedSlots.map((slot, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-primary/5">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">
                                                        {format(new Date(slot.date), 'EEEE, MMM d')} at {slot.time}
                                                    </span>
                                                    {index === 0 && (
                                                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeProposedSlot(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Interview Details */}
                            {proposedSlots.length > 0 && (
                                <>
                                    <Separator />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label className="mb-2 block">Interview Type *</Label>
                                            <Select value={interviewType} onValueChange={setInterviewType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {INTERVIEW_TYPES.map(type => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="mb-2 block">Target Company</Label>
                                            <Select value={targetCompany} onValueChange={setTargetCompany}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Optional" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TARGET_COMPANIES.map(company => (
                                                        <SelectItem key={company} value={company}>{company}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="mb-2 block">Duration</Label>
                                            <Select value={duration} onValueChange={setDuration}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="30">30 minutes</SelectItem>
                                                    <SelectItem value="45">45 minutes</SelectItem>
                                                    <SelectItem value="60">60 minutes</SelectItem>
                                                    <SelectItem value="90">90 minutes</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="mb-2 block">Notes for Interviewer</Label>
                                        <Textarea
                                            placeholder="Any specific topics you'd like to focus on, or questions you have..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Booking Summary */}
                    {proposedSlots.length > 0 && interviewType && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Proposed Times</span>
                                        <span className="font-medium">{proposedSlots.length} option{proposedSlots.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Duration</span>
                                        <span className="font-medium">{duration} minutes</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Interview Type</span>
                                        <span className="font-medium">{interviewType}</span>
                                    </div>
                                    {targetCompany && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Target Company</span>
                                            <span className="font-medium">{targetCompany}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-base">
                                        <span className="font-medium">Total</span>
                                        <span className="font-bold text-primary">₹{sessionCost.toFixed(0)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-6"
                                    size="lg"
                                    onClick={handleBook}
                                    disabled={createBooking.isPending || isPaymentLoading}
                                >
                                    {createBooking.isPending || isPaymentLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : razorpayConfig?.isConfigured ? (
                                        <>
                                            <CreditCard className="h-4 w-4 mr-2" />
                                            Pay ₹{sessionCost.toFixed(0)} & Book
                                        </>
                                    ) : (
                                        `Book for ₹${sessionCost.toFixed(0)}`
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    {razorpayConfig?.isConfigured
                                        ? "Secure payment via Razorpay • UPI, Cards, Net Banking"
                                        : "Payment will be charged after interviewer confirms"}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
