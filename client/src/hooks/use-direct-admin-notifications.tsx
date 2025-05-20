import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  priority: string;
  userId: number;
  relatedItemId?: number | null;
  relatedItemType?: string | null;
  emoji?: string;
  actionUrl?: string;
}

export function useDirectAdminNotifications(adminUsername: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    if (!adminUsername) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/direct-admin-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminUsername }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [adminUsername]);
  
  // Initial fetch
  useEffect(() => {
    if (adminUsername) {
      fetchNotifications();
    }
  }, [adminUsername, fetchNotifications]);
  
  // Mark a notification as read
  const markAsRead = useCallback(async (id: number) => {
    if (!adminUsername) return;
    
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
          ? { ...notification, isRead: true } 
          : notification
        )
      );
      
      const response = await fetch('/api/direct-admin-notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          adminUsername,
          notificationId: id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // The optimistic update already took place
    } catch (err) {
      console.error('Error marking notification as read:', err);
      
      // Revert the optimistic update on error
      await fetchNotifications();
    }
  }, [adminUsername, fetchNotifications]);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!adminUsername || notifications.length === 0) return;
    
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      const response = await fetch('/api/direct-admin-notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminUsername }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // The optimistic update already took place
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      
      // Revert the optimistic update on error
      await fetchNotifications();
    }
  }, [adminUsername, notifications.length, fetchNotifications]);
  
  // Calculate number of unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };
}