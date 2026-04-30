import * as React from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useMeetingRoom } from "@/hooks/useDaily";
import {
    Loader2,
    ExternalLink,
    Maximize2,
    AlertCircle
} from "lucide-react";

interface VideoPanelProps {
    bookingId: string;
    isStarted: boolean;
}

export default function VideoPanel({ bookingId, isStarted }: VideoPanelProps) {
    const { session } = useSession();
    const { data: meetingRoom, isLoading: isLoadingRoom } = useMeetingRoom(bookingId);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const hasRoomUrl = Boolean(meetingRoom?.meeting_link);

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Open Daily.co room in new window
    const openInNewWindow = () => {
        if (meetingRoom?.meeting_link) {
            window.open(meetingRoom.meeting_link, '_blank', 'width=1200,height=800');
        }
    };

    if (!isStarted) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-900 text-white">
                <div className="text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-zinc-500" />
                    </div>
                    <p className="text-lg font-medium mb-2">Ready to join?</p>
                    <p className="text-sm text-zinc-400">
                        Click "Start Interview" to begin
                    </p>
                </div>
            </div>
        );
    }

    if (isLoadingRoom) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-900 text-white">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto text-zinc-400 animate-spin mb-4" />
                    <p className="text-sm text-zinc-400">Loading video room...</p>
                </div>
            </div>
        );
    }

    // If we have a Daily.co room URL, embed it directly — both users join the same room
    if (hasRoomUrl) {
        return (
            <div ref={containerRef} className="h-full flex flex-col bg-zinc-900">
                {/* Daily.co Embed — this is the actual shared video call */}
                <div className="flex-1 relative">
                    <iframe
                        src={meetingRoom!.meeting_link!}
                        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Video Interview"
                    />
                </div>

                {/* Controls bar */}
                <div className="p-2 bg-zinc-950 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                        Daily.co Video Room — Both participants see each other here
                    </span>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={openInNewWindow}
                            className="text-zinc-400 hover:text-white"
                            title="Open in new window"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="text-zinc-400 hover:text-white"
                            title="Toggle fullscreen"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // No room URL yet — show waiting state
    return (
        <div className="h-full flex items-center justify-center bg-zinc-900 text-white">
            <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto text-zinc-400 animate-spin mb-4" />
                <p className="text-lg font-medium mb-2">Waiting for video room...</p>
                <p className="text-sm text-zinc-400">
                    The video room is being set up. This will refresh automatically.
                </p>
            </div>
        </div>
    );
}
