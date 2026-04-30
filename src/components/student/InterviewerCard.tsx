import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { InterviewerWithDetails } from "@/types/database";
import { Star, Briefcase, ArrowRight, CheckCircle } from "lucide-react";

interface InterviewerCardProps {
    interviewer: InterviewerWithDetails;
    hasActiveBooking?: boolean;
}

export default function InterviewerCard({ interviewer, hasActiveBooking = false }: InterviewerCardProps) {
    const navigate = useNavigate();

    const hourlyRate = (interviewer.hourly_rate_cents ?? 50000) / 100;

    return (
        <Card className={`group hover:shadow-lg transition-shadow cursor-pointer ${hasActiveBooking ? 'border-green-200 dark:border-green-800' : ''}`}
            onClick={() => {
                if (!hasActiveBooking) {
                    navigate(`/app/student/interviewer/${interviewer.user_id}`);
                }
            }}
        >
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-background shadow">
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold">
                            {interviewer.first_name
                                ? `${(interviewer.first_name as string).charAt(0)}${(interviewer.last_name as string || '').charAt(0)}`
                                : interviewer.company_background?.slice(0, 2).toUpperCase() || 'IN'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg truncate">
                                {interviewer.first_name
                                    ? `${interviewer.first_name} ${interviewer.last_name || ''}`
                                    : interviewer.company_background || 'Interviewer'}
                            </h3>
                            {hasActiveBooking && (
                                <Badge variant="default" className="bg-green-600 text-xs shrink-0">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Booked
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>{interviewer.years_experience ?? 0}+ years</span>
                            {interviewer.average_rating > 0 && (
                                <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5">
                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                        {interviewer.average_rating.toFixed(1)}
                                        ({interviewer.review_count})
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                            {interviewer.specialties?.slice(0, 3).map(s => (
                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                            {(interviewer.specialties?.length ?? 0) > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{(interviewer.specialties?.length ?? 0) - 3}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">₹{hourlyRate}/hr</span>
                            {!hasActiveBooking ? (
                                <Button variant="ghost" size="sm" className="group-hover:text-primary">
                                    Book Interview <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            ) : (
                                <span className="text-sm text-muted-foreground">Session in progress</span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
