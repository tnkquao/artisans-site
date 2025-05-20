import React, { useState } from "react";
import { Bell, Check, Trash2, X, ArrowDownAZ, Clock } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import type { Notification as AppNotification } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationActions } from "@/components/notifications/notification-actions";
import { SmartNotificationItem } from "@/components/notifications/smart-notification-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  
  const [sortOrder, setSortOrder] = useState<'newest' | 'priority'>('newest');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground animate-pulse";
      case "high":
        return "bg-orange-500 text-white";
      case "normal":
        return "bg-primary text-primary-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      case "info":
        return "bg-blue-400 text-white";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Special handling for notifications with specific types
    if (notification.type === 'project_team') {
      // This will be caught by the Link component in SmartNotificationItem
      // and will navigate to the /project-invitations page
      console.log('Project team invitation clicked');
    }
  };

  // Priority ranking for sorting
  const priorityRank = {
    'urgent': 1,
    'high': 2,
    'normal': 3,
    'low': 4,
    'info': 5
  };
  
  // Sort notifications based on the selected order
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (sortOrder === 'newest') {
      // Sort by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Sort by priority (highest first), then by date
      const priorityDiff = 
        (priorityRank[a.priority as keyof typeof priorityRank] || 999) - 
        (priorityRank[b.priority as keyof typeof priorityRank] || 999);
      
      if (priorityDiff === 0) {
        // If same priority, sort by date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return priorityDiff;
    }
  });
  
  // Check if there's any urgent notification
  const hasUrgentNotification = notifications.some(n => n.priority === 'urgent' && !n.read);
  // Check if there's any high priority notification
  const hasHighPriorityNotification = notifications.some(n => n.priority === 'high' && !n.read);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "relative p-2",
            unreadCount > 0 && "animate-subtle-bounce",
            hasUrgentNotification && "animate-shake"
          )} 
          size="icon"
        >
          <Bell className={cn(
            "h-5 w-5",
            unreadCount > 0 && "text-primary",
            hasUrgentNotification && "text-destructive animate-priority-pulse",
            hasHighPriorityNotification && !hasUrgentNotification && "text-orange-500"
          )} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white transition-all duration-200",
              hasUrgentNotification ? "bg-destructive animate-priority-pulse" : 
              hasHighPriorityNotification ? "bg-orange-500" : 
              unreadCount > 3 ? "bg-destructive" : "bg-orange-500"
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `You have ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}` : 'No new notifications'}
            </p>
          </div>
          <div className="flex space-x-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => markAllAsRead()}
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Sort selector */}
        {notifications.length > 1 && (
          <div className="px-4 py-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Sort notifications</span>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'newest' | 'priority')}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">
                  <span className="flex items-center">
                    <Clock className="mr-2 h-3.5 w-3.5" />
                    Newest first
                  </span>
                </SelectItem>
                <SelectItem value="priority" className="text-xs">
                  <span className="flex items-center">
                    <ArrowDownAZ className="mr-2 h-3.5 w-3.5" />
                    Priority
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <>
              {/* Unread notifications section */}
              {unreadCount > 0 && (
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Unread</h3>
                    <Badge variant="outline" className="text-[10px]">{unreadCount}</Badge>
                  </div>
                  <DropdownMenuGroup>
                    {sortedNotifications
                      .filter(notification => !notification.read)
                      .map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="p-1 px-2 focus:bg-transparent hover:bg-transparent"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <SmartNotificationItem
                            notification={notification}
                            onDelete={deleteNotification}
                            onMarkAsRead={markAsRead}
                            onClick={handleNotificationClick}
                          />
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuGroup>
                </div>
              )}
              
              {/* Add separator if there are both read and unread notifications */}
              {unreadCount > 0 && notifications.some(n => n.read) && (
                <DropdownMenuSeparator className="my-1" />
              )}
              
              {/* Read notifications section - only show if there are read notifications */}
              {notifications.some(n => n.read) && (
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">{unreadCount > 0 ? 'Earlier' : 'Notifications'}</h3>
                    <Badge variant="outline" className="text-[10px] opacity-70">
                      {notifications.filter(n => n.read).length}
                    </Badge>
                  </div>
                  <DropdownMenuGroup>
                    {sortedNotifications
                      .filter(notification => notification.read)
                      .map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="p-1 px-2 focus:bg-transparent hover:bg-transparent"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <SmartNotificationItem
                            notification={notification}
                            onDelete={deleteNotification}
                            onMarkAsRead={markAsRead}
                            onClick={handleNotificationClick}
                          />
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuGroup>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}