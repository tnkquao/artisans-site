import React, { createContext, useContext, ReactNode } from 'react';
import { useDirectAdminAuth } from '@/hooks/use-direct-admin-auth';
import { useDirectAdminNotifications, Notification } from '@/hooks/use-direct-admin-notifications';

interface AdminNotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextType | null>(null);

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationsContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within a DirectAdminNotificationsProvider');
  }
  return context;
};

interface DirectAdminNotificationsProviderProps {
  children: ReactNode;
}

export const DirectAdminNotificationsProvider: React.FC<DirectAdminNotificationsProviderProps> = ({ 
  children 
}) => {
  const { adminUser } = useDirectAdminAuth();
  const isAuthenticated = !!adminUser;
  const adminUsername = adminUser?.username;
  
  // Only initialize the notifications hook if a user is authenticated
  const notificationsData = useDirectAdminNotifications(
    isAuthenticated && adminUsername ? adminUsername : ''
  );
  
  // Create a default value for when the user is not authenticated
  const contextValue = isAuthenticated && adminUsername
    ? notificationsData
    : {
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: async () => {},
        markAllAsRead: async () => {},
        fetchNotifications: async () => {},
      };
  
  return (
    <AdminNotificationsContext.Provider value={contextValue}>
      {children}
    </AdminNotificationsContext.Provider>
  );
};

export default DirectAdminNotificationsProvider;