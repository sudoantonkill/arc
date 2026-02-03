import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/hooks/useSession";
import { useChat } from "@/hooks/useChat";
import { Send, Paperclip, Code } from "lucide-react";
import { format } from "date-fns";

interface ChatPanelProps {
    bookingId: string;
}

interface Message {
    id: string;
    sender: 'me' | 'other';
    content: string;
    timestamp: Date;
    type: 'text' | 'code';
}

export default function ChatPanel({ bookingId }: ChatPanelProps) {
    const { session } = useSession();
    const { messages, sendMessage } = useChat(bookingId);
    const [newMessage, setNewMessage] = React.useState('');
    const [isCodeMode, setIsCodeMode] = React.useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!newMessage.trim()) return;

        sendMessage.mutate({
            content: newMessage,
            type: isCodeMode ? 'code' : 'text',
        });

        setNewMessage('');
        setIsCodeMode(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-full flex flex-col bg-card border-t">
            {/* Header */}
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium">Chat</span>
                <span className="text-xs text-muted-foreground">{messages.length} messages</span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4">
                            No messages yet. Start the conversation!
                        </p>
                    )}
                    {messages.map(message => {
                        const isMe = message.sender_id === session?.user?.id;
                        return (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                            >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback className={isMe
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    }>
                                        {isMe ? 'ME' : 'IN'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                                    <div className={`max-w-[280px] rounded-lg px-3 py-2 ${isMe
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}>
                                        {message.type === 'code' ? (
                                            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                                {message.content}
                                            </pre>
                                        ) : (
                                            <p className="text-sm">{message.content}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(message.created_at), 'h:mm a')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t bg-muted/30">
                <div className="flex gap-2">
                    <Button
                        variant={isCodeMode ? "default" : "ghost"}
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => setIsCodeMode(!isCodeMode)}
                        title="Toggle code mode"
                    >
                        <Code className="h-4 w-4" />
                    </Button>
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isCodeMode ? "Paste code snippet..." : "Type a message..."}
                        className={isCodeMode ? "font-mono text-sm" : ""}
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sendMessage.isPending}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                {isCodeMode && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Code mode is on. Your message will be formatted as code.
                    </p>
                )}
            </div>
        </div>
    );
}
