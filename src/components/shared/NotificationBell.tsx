import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useNotifications";
import { Bell, Check, Calendar, MessageSquare, DollarSign, Star, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
    booking_request: <Calendar className="h-4 w-4 text-blue-500" />,
    booking_confirmed: <Check className="h-4 w-4 text-green-500" />,
    booking_cancelled: <AlertCircle className="h-4 w-4 text-red-500" />,
    feedback_received: <Star className="h-4 w-4 text-amber-500" />,
    payment_received: <DollarSign className="h-4 w-4 text-green-500" />,
    payout_completed: <DollarSign className="h-4 w-4 text-blue-500" />,
    message_received: <MessageSquare className="h-4 w-4 text-purple-500" />,
};

export default function NotificationBell() {
    const { data: notifications = [], isLoading } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleNotificationClick = (notificationId: string, actionUrl?: string) => {
        markRead.mutate(notificationId);
        if (actionUrl) {
            window.location.href = actionUrl;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => markAllRead.mutate()}
                        >
                            Mark all as read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.slice(0, 20).map(notification => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 cursor-pointer ${!notification.is_read ? 'bg-muted/50' : ''
                                    }`}
                                onClick={() => handleNotificationClick(notification.id, notification.action_url ?? undefined)}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {NOTIFICATION_ICONS[notification.type] || <Bell className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                                        {notification.title}
                                    </p>
                                    {notification.message && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                            {notification.message}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>

                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="justify-center text-sm text-primary">
                            View all notifications
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
