import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/hooks/useSession";
import { useMeetingRoom } from "@/hooks/useDaily";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    Maximize2,
    Users,
    Loader2,
    ExternalLink,
    AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VideoPanelProps {
    bookingId: string;
    isStarted: boolean;
}

export default function VideoPanel({ bookingId, isStarted }: VideoPanelProps) {
    const { session } = useSession();
    const { data: meetingRoom, isLoading: isLoadingRoom } = useMeetingRoom(bookingId);

    const [isVideoOn, setIsVideoOn] = React.useState(true);
    const [isMicOn, setIsMicOn] = React.useState(true);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [useDailyEmbed, setUseDailyEmbed] = React.useState(true);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const localVideoRef = React.useRef<HTMLVideoElement>(null);
    const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);

    const userInitials = session?.user?.email?.slice(0, 2).toUpperCase() || 'ME';
    const hasRoomUrl = Boolean(meetingRoom?.meeting_link);

    // Request camera access for local preview (fallback mode)
    React.useEffect(() => {
        if (!isStarted || hasRoomUrl) return;

        const startMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Failed to access media devices:', error);
            }
        };

        startMedia();

        return () => {
            localStream?.getTracks().forEach(track => track.stop());
        };
    }, [isStarted, hasRoomUrl]);

    // Toggle video (fallback mode)
    React.useEffect(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoOn;
            });
        }
    }, [isVideoOn, localStream]);

    // Toggle audio (fallback mode)
    React.useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMicOn;
            });
        }
    }, [isMicOn, localStream]);

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
                    <Users className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                    <p className="text-lg font-medium mb-2">Ready to join?</p>
                    <p className="text-sm text-zinc-400">
                        Click "Start Interview" to enable video and audio
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

    // If we have a Daily.co room URL, use the embed
    if (hasRoomUrl && useDailyEmbed) {
        return (
            <div ref={containerRef} className="h-full flex flex-col bg-zinc-900">
                {/* Daily.co Embed */}
                <div className="flex-1 relative">
                    <iframe
                        ref={iframeRef}
                        src={meetingRoom.meeting_link}
                        allow="camera; microphone; fullscreen; speaker; display-capture"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Video Interview"
                    />
                </div>

                {/* Extra Controls */}
                <div className="p-2 bg-zinc-950 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUseDailyEmbed(false)}
                        className="text-zinc-400 hover:text-white"
                    >
                        Use local preview
                    </Button>

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

    // Fallback to local camera preview (no room URL or user chose local)
    return (
        <div ref={containerRef} className="h-full flex flex-col bg-zinc-900">
            {/* Video Grid */}
            <div className="flex-1 p-4 grid grid-rows-2 gap-4">
                {/* Remote participant (placeholder when no room) */}
                <div className="relative rounded-xl overflow-hidden bg-zinc-800">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="h-24 w-24">
                            <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                IN
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 rounded text-white text-sm">
                        Interviewer
                    </div>
                    {!hasRoomUrl && (
                        <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                Waiting for video room
                            </span>
                        </div>
                    )}
                </div>

                {/* Local video */}
                <div className="relative rounded-xl overflow-hidden bg-zinc-800">
                    {isVideoOn ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Avatar className="h-20 w-20">
                                <AvatarFallback className="text-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 rounded text-white text-sm">
                        You {!isMicOn && '🔇'}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-zinc-950">
                <div className="flex items-center justify-center gap-3">
                    <Button
                        variant={isMicOn ? "secondary" : "destructive"}
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setIsMicOn(!isMicOn)}
                    >
                        {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant={isVideoOn ? "secondary" : "destructive"}
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setIsVideoOn(!isVideoOn)}
                    >
                        {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={toggleFullscreen}
                    >
                        <Maximize2 className="h-5 w-5" />
                    </Button>

                    {hasRoomUrl && (
                        <Button
                            variant="default"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => setUseDailyEmbed(true)}
                            title="Join video room"
                        >
                            <ExternalLink className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Status message */}
            <div className="px-4 pb-3 text-center">
                {hasRoomUrl ? (
                    <p className="text-xs text-green-400">
                        ✓ Video room ready. Click the join button to connect with your interviewer.
                    </p>
                ) : (
                    <p className="text-xs text-zinc-500">
                        Local preview mode. Video room will be created when the interview starts.
                    </p>
                )}
            </div>
        </div>
    );
}
