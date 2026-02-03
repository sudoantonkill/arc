import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/hooks/useSession";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    Maximize2,
    Users,
    PhoneOff
} from "lucide-react";

interface VideoPanelProps {
    bookingId: string;
    isStarted: boolean;
}

export default function VideoPanel({ bookingId, isStarted }: VideoPanelProps) {
    const { session } = useSession();
    const [isVideoOn, setIsVideoOn] = React.useState(true);
    const [isMicOn, setIsMicOn] = React.useState(true);
    const [isScreenSharing, setIsScreenSharing] = React.useState(false);
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const localVideoRef = React.useRef<HTMLVideoElement>(null);
    const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);

    // Request camera access
    React.useEffect(() => {
        if (!isStarted) return;

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
    }, [isStarted]);

    // Toggle video
    React.useEffect(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoOn;
            });
        }
    }, [isVideoOn, localStream]);

    // Toggle audio
    React.useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMicOn;
            });
        }
    }, [isMicOn, localStream]);

    const userInitials = session?.user?.email?.slice(0, 2).toUpperCase() || 'ME';

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

    return (
        <div className="h-full flex flex-col bg-zinc-900">
            {/* Video Grid */}
            <div className="flex-1 p-4 grid grid-rows-2 gap-4">
                {/* Remote participant (placeholder) */}
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
                        variant={isScreenSharing ? "default" : "secondary"}
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                    >
                        <Monitor className="h-5 w-5" />
                    </Button>

                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                        <Maximize2 className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Note about video */}
            <div className="px-4 pb-3 text-center">
                <p className="text-xs text-zinc-500">
                    💡 This is a demo. In production, video would be powered by Daily.co or WebRTC
                </p>
            </div>
        </div>
    );
}
