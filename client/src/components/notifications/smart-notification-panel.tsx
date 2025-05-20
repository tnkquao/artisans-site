import React, { useState } from 'react';
import { Bell, Check, ClipboardList, Filter } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification as AppNotification } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SmartNotificationItem } from './smart-notification-item';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SmartNotificationPanel() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [showAllNotificationsDialog, setShowAllNotificationsDialog] = useState(false);

  // Filter notifications based on active tab and selected priority
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread' && notification.read) {
      return false;
    }
    if (activeTab === 'urgent' && notification.priority !== 'urgent' && notification.priority !== 'high') {
      return false;
    }
    if (selectedPriority && notification.priority !== selectedPriority) {
      return false;
    }
    return true;
  });

  // Get counts for each priority
  const urgentCount = notifications.filter(n => n.priority === 'urgent').length;
  const highCount = notifications.filter(n => n.priority === 'high').length;
  const normalCount = notifications.filter(n => n.priority === 'normal').length;
  const lowCount = notifications.filter(n => n.priority === 'low').length;

  // Sort notifications - urgent first, then by date
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // First sort by read status (unread first)
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    
    // Then by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3, info: 4 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Finally by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleSelectPriority = (priority: string | null) => {
    setSelectedPriority(priority);
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative p-2" size="icon">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 md:w-96">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} new
                  </Badge>
                )}
              </h3>
              <div className="flex">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => markAllAsRead()}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Mark all read
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 ml-1">
                      <Filter className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem 
                        onClick={() => handleSelectPriority(null)}
                        className={cn(selectedPriority === null && "bg-accent")}
                      >
                        <span className="flex-1">All</span>
                        <Badge variant="outline">{notifications.length}</Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSelectPriority('urgent')}
                        className={cn(selectedPriority === 'urgent' && "bg-accent")}
                      >
                        <span className="flex items-center">
                          <span className="mr-2 text-sm">🚨</span>
                          <span className="flex-1">Urgent</span>
                        </span>
                        <Badge variant="destructive">{urgentCount}</Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSelectPriority('high')}
                        className={cn(selectedPriority === 'high' && "bg-accent")}
                      >
                        <span className="flex items-center">
                          <span className="mr-2 text-sm">❗</span>
                          <span className="flex-1">High</span>
                        </span>
                        <Badge className="bg-orange-500">{highCount}</Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSelectPriority('normal')}
                        className={cn(selectedPriority === 'normal' && "bg-accent")}
                      >
                        <span className="flex items-center">
                          <span className="mr-2 text-sm">📢</span>
                          <span className="flex-1">Normal</span>
                        </span>
                        <Badge>{normalCount}</Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSelectPriority('low')}
                        className={cn(selectedPriority === 'low' && "bg-accent")}
                      >
                        <span className="flex items-center">
                          <span className="mr-2 text-sm">ℹ️</span>
                          <span className="flex-1">Low</span>
                        </span>
                        <Badge variant="outline">{lowCount}</Badge>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="mt-2">
              <Tabs
                defaultValue="all"
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </TabsTrigger>
                  <TabsTrigger value="urgent" className="text-xs">
                    Important {(urgentCount + highCount) > 0 && `(${urgentCount + highCount})`}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <ScrollArea className="h-[400px] overflow-y-auto">
            {sortedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">
                  {selectedPriority
                    ? `No ${selectedPriority} priority notifications`
                    : activeTab === 'unread'
                    ? 'No unread notifications'
                    : activeTab === 'urgent'
                    ? 'No important notifications'
                    : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="px-3 py-2">
                {sortedNotifications.slice(0, 5).map((notification) => (
                  <SmartNotificationItem
                    key={notification.id}
                    notification={notification}
                    onDelete={deleteNotification}
                    onMarkAsRead={markAsRead}
                    onClick={handleNotificationClick}
                  />
                ))}
                
                {sortedNotifications.length > 5 && (
                  <div className="flex justify-center mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowAllNotificationsDialog(true);
                        setIsOpen(false);
                      }}
                      className="w-full"
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      View All {sortedNotifications.length} Notifications
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Full notifications dialog */}
      <Dialog 
        open={showAllNotificationsDialog} 
        onOpenChange={setShowAllNotificationsDialog}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>All Notifications</DialogTitle>
            <DialogDescription>
              View and manage all your notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-between items-center mb-4">
            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as any)}
              className="w-full"
            >
              <TabsList className="w-auto">
                <TabsTrigger value="all">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger value="urgent">
                  Important {(urgentCount + highCount) > 0 && `(${urgentCount + highCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filter
                    {selectedPriority && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedPriority}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setSelectedPriority(null)}>
                      <span className="flex-1">All</span>
                      <Badge variant="outline">{notifications.length}</Badge>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority('urgent')}>
                      <span className="flex items-center">
                        <span className="mr-2 text-sm">🚨</span>
                        <span className="flex-1">Urgent</span>
                      </span>
                      <Badge variant="destructive">{urgentCount}</Badge>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority('high')}>
                      <span className="flex items-center">
                        <span className="mr-2 text-sm">❗</span>
                        <span className="flex-1">High</span>
                      </span>
                      <Badge className="bg-orange-500">{highCount}</Badge>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority('normal')}>
                      <span className="flex items-center">
                        <span className="mr-2 text-sm">📢</span>
                        <span className="flex-1">Normal</span>
                      </span>
                      <Badge>{normalCount}</Badge>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority('low')}>
                      <span className="flex items-center">
                        <span className="mr-2 text-sm">ℹ️</span>
                        <span className="flex-1">Low</span>
                      </span>
                      <Badge variant="outline">{lowCount}</Badge>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => markAllAsRead()}
                >
                  <Check className="mr-2 h-3.5 w-3.5" />
                  Mark all as read
                </Button>
              )}
            </div>
          </div>
          
          <ScrollArea className="flex-1 pr-4">
            {sortedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">
                  {selectedPriority
                    ? `No ${selectedPriority} priority notifications`
                    : activeTab === 'unread'
                    ? 'No unread notifications'
                    : activeTab === 'urgent'
                    ? 'No important notifications'
                    : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedNotifications.map((notification) => (
                  <SmartNotificationItem
                    key={notification.id}
                    notification={notification}
                    onDelete={deleteNotification}
                    onMarkAsRead={markAsRead}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAllNotificationsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}