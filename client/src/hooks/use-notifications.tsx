import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Notification as AppNotification } from "@shared/schema";
import { playNotificationSound, initNotificationSounds } from "@/lib/notification-sounds";

export function useNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [newNotifications, setNewNotifications] = useState<AppNotification[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Fetch all notifications for the current user
  const {
    data: serverNotifications = [],
    isLoading,
    error,
    refetch
  } = useQuery<AppNotification[]>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Combine server notifications with newly received ones via WebSocket
  // Ensure we don't have duplicate notifications by using a Map with id as key
  const notificationsMap = new Map<number, AppNotification>();
  
  // First add server notifications
  serverNotifications.forEach(notification => {
    notificationsMap.set(notification.id, notification);
  });
  
  // Then add WebSocket notifications, overwriting any with the same ID
  newNotifications.forEach(notification => {
    notificationsMap.set(notification.id, notification);
  });
  
  // Convert back to array and sort by date (newest first)
  const notifications = Array.from(notificationsMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Get unread notification count
  const { 
    data: unreadCountData,
  } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: getQueryFn({ on401: "returnNull" })
  });
  
  const unreadCount = unreadCountData?.count || 0 + newNotifications.filter(n => !n.read).length;
  
  // Initialize notification sounds
  useEffect(() => {
    initNotificationSounds();
  }, []);

  // Set up WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user) return;
    
    // Create WebSocket connection for real-time notifications
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setSocket(ws);
    
    ws.addEventListener("open", () => {
      console.log("WebSocket connection established");
      // Authenticate the WebSocket connection
      ws.send(JSON.stringify({
        type: "auth",
        userId: user.id,
        username: user.username,
        role: user.role
      }));
    });
    
    ws.addEventListener("message", (event) => {
      try {
        console.log("WebSocket message received:", event.data);
        const data = JSON.parse(event.data);
        
        // Handle real-time notifications
        if (data.type === "notification") {
          const notification = data.notification;
          
          // Add the new notification to the local state, ensuring no duplicates
          setNewNotifications(prev => {
            // Check if this notification already exists in our state
            const existingIndex = prev.findIndex(n => n.id === notification.id);
            if (existingIndex >= 0) {
              // If it exists, replace it
              const newArr = [...prev];
              newArr[existingIndex] = notification;
              return newArr;
            } else {
              // If it's new, add it to the beginning
              return [notification, ...prev];
            }
          });
          
          // Play sound based on notification priority
          playNotificationSound(notification.priority);
          
          // Show a toast for the new notification
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.priority === "urgent" ? "destructive" : "default",
          });
          
          // Refresh notification counts
          queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        }
        
        // Handle multiple notifications sent at once
        if (data.type === "notifications" && Array.isArray(data.notifications)) {
          // Check if there are any high priority notifications in the batch
          const highPriorityNotification = data.notifications.find(
            (n: AppNotification) => n.priority === 'urgent' || n.priority === 'high'
          );
          
          if (highPriorityNotification) {
            // Play sound for the highest priority notification
            playNotificationSound(highPriorityNotification.priority);
          }
          
          setNewNotifications(prev => [
            ...data.notifications.map((n: AppNotification) => n), 
            ...prev
          ]);
        }
        
        // Handle notifications being marked as read
        if (data.type === "notifications_marked_read" && Array.isArray(data.notificationIds)) {
          setNewNotifications(prev => 
            prev.map(n => 
              data.notificationIds.includes(n.id) 
                ? { ...n, read: true } 
                : n
            )
          );
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
    
    // Set up automatic reconnection logic
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3; // Limit reconnection attempts
    
    const handleReconnect = () => {
      // Only attempt reconnection if we haven't exceeded max attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log(`Max WebSocket reconnect attempts (${maxReconnectAttempts}) reached, giving up`);
        return;
      }
      
      reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
      
      // Clear any existing reconnect timeout
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      
      // Increase the reconnect delay with each attempt (exponential backoff)
      const reconnectDelay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 30000);
      
      // Reconnect after the calculated delay
      reconnectTimeout = setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          try {
            const newWs = new WebSocket(wsUrl);
            socketRef.current = newWs;
            setSocket(newWs);
            
            // Set up the same event listeners on the new connection
            setupEventListeners(newWs);
          } catch (error) {
            console.error("Failed to create new WebSocket connection:", error);
          }
        }
      }, reconnectDelay);
    };
    
    const setupEventListeners = (wsConnection: WebSocket) => {
      wsConnection.addEventListener("open", () => {
        // Reset reconnect attempts when successfully connected
        reconnectAttempts = 0;
      });
      
      wsConnection.addEventListener("error", (event) => {
        console.error("WebSocket error:", event);
        // Don't reconnect immediately on error, wait for close event
      });
      
      wsConnection.addEventListener("close", () => {
        console.log("WebSocket connection closed");
        handleReconnect();
      });
    };
    
    // Set up error and close handlers with reconnection logic
    setupEventListeners(ws);
    
    // Clean up WebSocket connection and timeouts when component unmounts
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, toast]);
  
  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to mark notification as read: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to mark all notifications as read: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete notification: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Function to mark notifications as read through WebSocket
  const markAsReadThroughWebSocket = (notificationId: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'mark_read',
        notificationIds: [notificationId]
      }));
      
      // Also mark in local state
      setNewNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      // Use the API as fallback/confirmation
      markAsReadMutation.mutate(notificationId);
    } else {
      // Fallback to API if WebSocket is not available
      markAsReadMutation.mutate(notificationId);
    }
  };
  
  // Function to mark all notifications as read through WebSocket
  const markAllAsReadThroughWebSocket = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);
        
      if (unreadIds.length > 0) {
        socket.send(JSON.stringify({
          type: 'mark_read',
          notificationIds: unreadIds
        }));
        
        // Also mark in local state
        setNewNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
      }
      
      // Use the API as fallback/confirmation
      markAllAsReadMutation.mutate();
    } else {
      // Fallback to API if WebSocket is not available
      markAllAsReadMutation.mutate();
    }
  };
  
  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadThroughWebSocket,
    markAllAsRead: markAllAsReadThroughWebSocket,
    deleteNotification: deleteNotificationMutation.mutate,
    socket,
    isConnected: socket?.readyState === WebSocket.OPEN
  };
}