import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Clock, StickyNote, StopCircle, AlertTriangle } from "lucide-react";

interface InterviewControlsProps {
    elapsedTime: number;
    durationMinutes: number;
    onEndInterview: () => void;
}

export default function InterviewControls({
    elapsedTime,
    durationMinutes,
    onEndInterview
}: InterviewControlsProps) {
    const [notes, setNotes] = React.useState('');
    const [showNotes, setShowNotes] = React.useState(false);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalSeconds = durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedTime);
    const progressPercent = (elapsedTime / totalSeconds) * 100;
    const isOvertime = elapsedTime > totalSeconds;
    const isNearEnd = remainingSeconds < 300 && remainingSeconds > 0; // Last 5 minutes

    return (
        <div className="space-y-4">
            {/* Timer Card */}
            <Card className={`p-4 ${isOvertime ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : isNearEnd ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className={`h-5 w-5 ${isOvertime ? 'text-red-500' : isNearEnd ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">Time</span>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-mono font-bold ${isOvertime ? 'text-red-500' : ''}`}>
                            {formatTime(elapsedTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {isOvertime ? (
                                <span className="text-red-500">+{formatTime(elapsedTime - totalSeconds)} overtime</span>
                            ) : (
                                `${formatTime(remainingSeconds)} remaining`
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${isOvertime ? 'bg-red-500' : isNearEnd ? 'bg-amber-500' : 'bg-primary'
                            }`}
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                </div>
            </Card>

            {/* Warning if near end */}
            {isNearEnd && !isOvertime && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Less than 5 minutes remaining</span>
                </div>
            )}

            {/* Notes */}
            <Card className="p-4">
                <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center justify-between w-full text-left"
                >
                    <div className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Private Notes</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {showNotes ? 'Hide' : 'Show'}
                    </span>
                </button>

                {showNotes && (
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Take notes during the interview (only visible to you)..."
                        className="mt-3"
                        rows={4}
                    />
                )}
            </Card>

            {/* End Interview */}
            <Button
                variant="destructive"
                className="w-full"
                onClick={onEndInterview}
            >
                <StopCircle className="h-4 w-4 mr-2" />
                End Interview
            </Button>
        </div>
    );
}
