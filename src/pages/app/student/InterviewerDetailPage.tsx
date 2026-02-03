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
import { useToast } from "@/hooks/use-toast";
import { INTERVIEW_TYPES, TARGET_COMPANIES, DAYS_OF_WEEK } from "@/types/database";
import { formatCents } from "@/hooks/useWallet";
import {
    Star,
    Briefcase,
    MapPin,
    Clock,
    ArrowLeft,
    Calendar as CalendarIcon,
    CheckCircle,
    Loader2
} from "lucide-react";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay, parse } from "date-fns";

export default function InterviewerDetailPage() {
    const { interviewerId } = useParams<{ interviewerId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: interviewer, isLoading } = useInterviewer(interviewerId ?? '');
    const { data: availability = [] } = useInterviewerAvailability(interviewerId ?? '');
    const createBooking = useCreateBooking();

    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = React.useState<string>("");
    const [interviewType, setInterviewType] = React.useState<string>("");
    const [targetCompany, setTargetCompany] = React.useState<string>("");
    const [duration, setDuration] = React.useState<string>("60");
    const [notes, setNotes] = React.useState<string>("");
    const [step, setStep] = React.useState<'details' | 'booking' | 'confirm'>('details');

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

    const handleBook = async () => {
        if (!interviewerId || !selectedDate || !selectedTime || !interviewType) {
            toast({ title: "Please fill all required fields", variant: "destructive" });
            return;
        }

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

        try {
            await createBooking.mutateAsync({
                interviewer_id: interviewerId,
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: parseInt(duration),
                interview_type: interviewType,
                target_company: targetCompany || undefined,
                student_notes: notes || undefined,
            });

            toast({
                title: "Booking request sent!",
                description: "The interviewer will confirm your booking soon."
            });

            setStep('confirm');
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

    const hourlyRate = (interviewer.hourly_rate_cents ?? 5000) / 100;
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
                        <p className="text-muted-foreground mb-6">
                            Your interview request has been sent to the interviewer.
                            You'll receive a confirmation once they accept.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button variant="outline" onClick={() => navigate('/app/student')}>
                                Back to Dashboard
                            </Button>
                            <Button onClick={() => { setStep('details'); setSelectedDate(undefined); setSelectedTime(''); }}>
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
                                <p className="text-3xl font-bold text-primary">${hourlyRate}</p>
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
                                Select a date, time, and interview type to book your session
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
                                    )}
                                </div>
                            )}

                            {/* Interview Details */}
                            {selectedTime && (
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
                    {selectedDate && selectedTime && interviewType && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Date</span>
                                        <span className="font-medium">{format(selectedDate, 'MMMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Time</span>
                                        <span className="font-medium">{selectedTime}</span>
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
                                        <span className="font-bold text-primary">${sessionCost.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-6"
                                    size="lg"
                                    onClick={handleBook}
                                    disabled={createBooking.isPending}
                                >
                                    {createBooking.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Booking...
                                        </>
                                    ) : (
                                        `Book for $${sessionCost.toFixed(2)}`
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Payment will be charged after interviewer confirms
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
