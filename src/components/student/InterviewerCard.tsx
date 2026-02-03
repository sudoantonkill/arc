import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { InterviewerWithDetails } from "@/types/database";
import { formatCents } from "@/hooks/useWallet";
import { Star, Briefcase, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface InterviewerCardProps {
    interviewer: InterviewerWithDetails;
}

export default function InterviewerCard({ interviewer }: InterviewerCardProps) {
    const initials = interviewer.company_background
        ?.split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'IN';

    const hourlyRate = (interviewer.hourly_rate_cents ?? 5000) / 100;

    return (
        <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-lg font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="font-semibold text-lg truncate">
                                    {interviewer.company_background || 'Interviewer'}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{interviewer.years_experience ?? 0}+ years</span>
                                </div>
                            </div>

                            {interviewer.average_rating > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-md dark:bg-amber-950/30">
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                                        {interviewer.average_rating.toFixed(1)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        ({interviewer.review_count})
                                    </span>
                                </div>
                            )}
                        </div>

                        {interviewer.bio && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {interviewer.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {interviewer.specialties?.slice(0, 3).map(specialty => (
                                <Badge key={specialty} variant="secondary" className="text-xs">
                                    {specialty}
                                </Badge>
                            ))}
                            {(interviewer.specialties?.length ?? 0) > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{interviewer.specialties!.length - 3} more
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-lg text-primary">
                            ${hourlyRate}<span className="text-sm font-normal text-muted-foreground">/hr</span>
                        </span>
                        {interviewer.timezone && (
                            <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {interviewer.timezone.split('/')[1]?.replace('_', ' ') || interviewer.timezone}
                            </span>
                        )}
                    </div>

                    <Button asChild>
                        <Link to={`/app/student/interviewer/${interviewer.user_id}`}>
                            Book Interview
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
