import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInterviewers } from "@/hooks/useInterviewers";
import { useStudentActiveBookings } from "@/hooks/useBookings";
import InterviewerCard from "./InterviewerCard";
import { INTERVIEW_TYPES } from "@/types/database";
import { Search, Filter, Users, Loader2 } from "lucide-react";

export default function InterviewerBrowser() {
    const [search, setSearch] = React.useState("");
    const [specialty, setSpecialty] = React.useState("");
    const [maxRate, setMaxRate] = React.useState("");

    const { data: interviewers = [], isLoading } = useInterviewers({
        specialty: specialty || undefined,
        maxRate: maxRate ? parseInt(maxRate) * 100 : undefined,
    });

    // Get student's active bookings to filter out already-booked interviewers
    const { data: activeBookings = [] } = useStudentActiveBookings();
    const bookedInterviewerIds = React.useMemo(
        () => new Set(activeBookings.map(b => b.interviewer_id)),
        [activeBookings]
    );

    const filteredInterviewers = React.useMemo(() => {
        if (!search.trim()) return interviewers;
        const query = search.toLowerCase();
        return interviewers.filter(int =>
            (int.company_background?.toLowerCase().includes(query)) ||
            (int.bio?.toLowerCase().includes(query)) ||
            (int.specialties?.some(s => s.toLowerCase().includes(query)))
        );
    }, [interviewers, search]);

    // Separate into available and already booked
    const availableInterviewers = filteredInterviewers.filter(
        int => !bookedInterviewerIds.has(int.user_id)
    );
    const bookedInterviewers = filteredInterviewers.filter(
        int => bookedInterviewerIds.has(int.user_id)
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Browse Interviewers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Browse Interviewers
                </CardTitle>
                <CardDescription>
                    Find and book interviews with experienced professionals
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, company, or specialty..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={specialty} onValueChange={(val) => setSpecialty(val === 'all' ? '' : val)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="All specialties" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All specialties</SelectItem>
                            {INTERVIEW_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={maxRate} onValueChange={(val) => setMaxRate(val === 'all' ? '' : val)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Any price" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any price</SelectItem>
                            <SelectItem value="500">Under ₹500/hr</SelectItem>
                            <SelectItem value="1000">Under ₹1,000/hr</SelectItem>
                            <SelectItem value="2000">Under ₹2,000/hr</SelectItem>
                            <SelectItem value="5000">Under ₹5,000/hr</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Available Interviewers */}
                {filteredInterviewers.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="font-medium">No interviewers found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Try adjusting your search filters
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Available for booking */}
                        {availableInterviewers.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {availableInterviewers.map(interviewer => (
                                    <InterviewerCard
                                        key={interviewer.user_id}
                                        interviewer={interviewer}
                                        hasActiveBooking={false}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Already booked (shown at bottom, grayed out) */}
                        {bookedInterviewers.length > 0 && (
                            <>
                                {availableInterviewers.length > 0 && (
                                    <div className="flex items-center gap-3 mt-8 mb-4">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Already Booked</span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                )}
                                <div className="grid gap-4 md:grid-cols-2 opacity-60">
                                    {bookedInterviewers.map(interviewer => (
                                        <InterviewerCard
                                            key={interviewer.user_id}
                                            interviewer={interviewer}
                                            hasActiveBooking={true}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
