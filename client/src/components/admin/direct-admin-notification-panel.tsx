import React from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Notification, useDirectAdminNotifications } from '@/hooks/use-direct-admin-notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const formattedDate = new Date(notification.createdAt).toLocaleString();
  
  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };
  
  return (
    <div className={`p-4 border-b ${notification.isRead ? 'bg-gray-50/50' : 'bg-white'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl mr-1">{notification.emoji || '🔔'}</span>
            <h3 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
              {notification.title}
            </h3>
            
            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
              {notification.priority}
            </Badge>
          </div>
          
          <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
          
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">{formattedDate}</span>
            
            <div className="flex gap-2">
              {notification.actionUrl && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs"
                  onClick={() => window.location.href = notification.actionUrl!}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
              
              {!notification.isRead && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark as read
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DirectAdminNotificationPanelProps {
  adminUsername: string;
}

const DirectAdminNotificationPanel: React.FC<DirectAdminNotificationPanelProps> = ({ adminUsername }) => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error,
    markAsRead, 
    markAllAsRead 
  } = useDirectAdminNotifications(adminUsername);

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 px-1 min-w-4 h-4 flex justify-center items-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md p-0 pt-6">
        <SheetHeader className="px-6">
          <SheetTitle className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} unread</Badge>
              )}
            </span>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            Admin notifications and system alerts
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-2" />
        <ScrollArea className="h-[calc(100vh-40px)] pb-20">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              <X className="w-8 h-8 mx-auto mb-2" />
              <p>Failed to load notifications</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No notifications yet</p>
              <p className="text-sm">We'll notify you when something happens</p>
            </div>
          ) : (
            <div>
              {sortedNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default DirectAdminNotificationPanel;