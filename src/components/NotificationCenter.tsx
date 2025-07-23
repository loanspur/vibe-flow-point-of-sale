import React from 'react';
import { Bell, X, CheckCheck, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive'
};

const priorityIcons = {
  low: Info,
  medium: Bell,
  high: AlertTriangle,
  urgent: AlertCircle
};

export const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, loading } = useNotifications();

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notifications
      .filter(n => !n.is_read)
      .forEach(n => markAsRead(n.id));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-7"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => {
                    const PriorityIcon = priorityIcons[notification.priority];
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 border-b transition-colors hover:bg-muted/50 ${
                          !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1 rounded-full ${priorityColors[notification.priority]}`}>
                            <PriorityIcon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm leading-none">
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {notification.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};