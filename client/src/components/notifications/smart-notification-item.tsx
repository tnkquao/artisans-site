import React from 'react';
import { Check, Trash2, ExternalLink, Bell, AlertCircle, Clock } from 'lucide-react';
import type { Notification as AppNotification } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationActions } from './notification-actions';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SmartNotificationItemProps {
  notification: AppNotification;
  onDelete: (id: number) => void;
  onMarkAsRead: (id: number) => void;
  onClick: (notification: AppNotification) => void;
}

interface PriorityStyle {
  container: string;
  badge: string;
  icon: ReactNode;
  emoji: string;
  animate: string;
  sound?: string;
}

/**
 * Renders a notification with smart contextual styling based on priority and type
 */
export function SmartNotificationItem({
  notification,
  onDelete,
  onMarkAsRead,
  onClick,
}: SmartNotificationItemProps) {
  // Get default emoji based on notification type if not present
  const getDefaultEmoji = (type: string, priority: string) => {
    if (priority === 'urgent') return '🚨';
    
    switch (type) {
      case 'project':
      case 'project_create':
        return '🏗️';
      case 'project_update':
        return '🔄';
      case 'project_complete':
        return '🎉';
      case 'project_delay':
        return '⏰';
      case 'order':
        return '📦';
      case 'inventory':
        return '🧰';
      case 'material_delivery':
        return '🚚';
      case 'message':
        return '💬';
      case 'payment':
      case 'invoice':
        return '💰';
      case 'team_invitation':
        return '👋';
      case 'project_team':
        return '👥';
      case 'service_request':
        return '🔧';
      case 'bid':
        return '📝';
      case 'approval':
        return '✅';
      case 'rejection':
        return '❌';
      case 'document':
        return '📄';
      case 'timeline':
        return '📅';
      case 'milestone':
        return '🏁';
      case 'inspection':
        return '🔍';
      case 'permit':
        return '📋';
      default:
        return '🔔';
    }
  };

  // Priority color mapping with enhanced visual cues and animations
  const getPriorityStyles = (priority: string, notificationType: string): PriorityStyle => {
    // First, get the base styling based on priority
    let baseStyles: PriorityStyle = {
      container: '',
      badge: '',
      icon: <Bell className="h-4 w-4" />,
      emoji: '',
      animate: ''
    };
    
    switch (priority) {
      case 'urgent':
        baseStyles = {
          container: 'border-l-4 border-l-destructive bg-destructive/10 shadow-sm shadow-destructive/20 animate-glow',
          badge: 'bg-destructive text-destructive-foreground animate-priority-pulse font-semibold',
          icon: <AlertCircle className="h-4 w-4 text-destructive animate-priority-pulse" />,
          emoji: 'animate-subtle-bounce',
          animate: 'animate-slide-in-right',
          sound: 'notification-urgent'
        };
        break;
      case 'high':
        baseStyles = {
          container: 'border-l-4 border-l-orange-500 bg-orange-50/50 shadow-sm',
          badge: 'bg-orange-500 text-white font-medium',
          icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
          emoji: 'animate-subtle-bounce',
          animate: 'animate-fade-in-scale',
          sound: 'notification-high'
        };
        break;
      case 'normal':
        baseStyles = {
          container: 'border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10 transition-colors',
          badge: 'bg-primary/90 text-primary-foreground',
          icon: <Bell className="h-4 w-4 text-primary" />,
          emoji: '',
          animate: 'animate-fade-in-scale',
          sound: 'notification-normal'
        };
        break;
      case 'low':
        baseStyles = {
          container: 'border-l-4 border-l-muted bg-muted/10 hover:bg-muted/20 transition-colors',
          badge: 'bg-muted/80 text-muted-foreground',
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
          emoji: '',
          animate: '',
          sound: ''
        };
        break;
      case 'info':
        baseStyles = {
          container: 'border-l-4 border-l-blue-400 bg-blue-50/50 hover:bg-blue-50/70 transition-colors',
          badge: 'bg-blue-400 text-white',
          icon: <Bell className="h-4 w-4 text-blue-400" />,
          emoji: '',
          animate: 'animate-fade-in-scale',
          sound: ''
        };
        break;
      default:
        baseStyles = {
          container: 'border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10 transition-colors',
          badge: 'bg-primary text-primary-foreground',
          icon: <Bell className="h-4 w-4 text-primary" />,
          emoji: '',
          animate: '',
          sound: ''
        };
    }
    
    // Then apply type-specific customizations
    switch (notificationType) {
      case 'project':
      case 'project_create':
      case 'project_update': {
        const typeStyles: PriorityStyle = {
          ...baseStyles,
          container: priority === 'urgent' ? baseStyles.container : 'border-l-4 border-l-emerald-500 bg-emerald-50/50 shadow-sm',
          badge: priority === 'urgent' ? baseStyles.badge : 'bg-emerald-500 text-white font-medium',
          icon: priority === 'urgent' ? baseStyles.icon : <Bell className="h-4 w-4 text-emerald-500" />,
        };
        return typeStyles;
      }
      case 'order':
      case 'inventory': {
        const typeStyles: PriorityStyle = {
          ...baseStyles,
          container: priority === 'urgent' ? baseStyles.container : 'border-l-4 border-l-violet-500 bg-violet-50/50 shadow-sm',
          badge: priority === 'urgent' ? baseStyles.badge : 'bg-violet-500 text-white font-medium',
          icon: priority === 'urgent' ? baseStyles.icon : <Bell className="h-4 w-4 text-violet-500" />,
        };
        return typeStyles;
      }
      case 'message': {
        const typeStyles: PriorityStyle = {
          ...baseStyles,
          container: priority === 'urgent' ? baseStyles.container : 'border-l-4 border-l-blue-500 bg-blue-50/50 shadow-sm',
          badge: priority === 'urgent' ? baseStyles.badge : 'bg-blue-500 text-white font-medium',
          icon: priority === 'urgent' ? baseStyles.icon : <Bell className="h-4 w-4 text-blue-500" />,
        };
        return typeStyles;
      }
      case 'payment': {
        const typeStyles: PriorityStyle = {
          ...baseStyles,
          container: priority === 'urgent' ? baseStyles.container : 'border-l-4 border-l-green-500 bg-green-50/50 shadow-sm',
          badge: priority === 'urgent' ? baseStyles.badge : 'bg-green-500 text-white font-medium',
          icon: priority === 'urgent' ? baseStyles.icon : <Bell className="h-4 w-4 text-green-500" />,
        };
        return typeStyles;
      }
      case 'team_invitation':
      case 'project_team': {
        const typeStyles: PriorityStyle = {
          ...baseStyles,
          container: priority === 'urgent' ? baseStyles.container : 'border-l-4 border-l-indigo-500 bg-indigo-50/50 shadow-sm',
          badge: priority === 'urgent' ? baseStyles.badge : 'bg-indigo-500 text-white font-medium',
          icon: priority === 'urgent' ? baseStyles.icon : <Bell className="h-4 w-4 text-indigo-500" />,
        };
        return typeStyles;
      }
      default:
        return baseStyles;
    }
  };

  const priorityStyles = getPriorityStyles(notification.priority, notification.type);
  
  // Use default emoji if not provided
  const displayEmoji = notification.emoji || getDefaultEmoji(notification.type, notification.priority);

  // Get the time since notification was created
  const getTimeAgo = (date: Date | string) => {
    if (!date) return 'Recently';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'p-4 mb-2 rounded-md shadow-sm',
        !notification.read && 'bg-accent/20',
        priorityStyles.container,
        priorityStyles.animate
      )}
    >
      <div className="flex w-full justify-between items-start">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3 mt-1">
            <span 
              className={cn("text-2xl", priorityStyles.emoji)} 
              role="img" 
              aria-label="notification type"
            >
              {displayEmoji}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
          </div>
        </div>
        <div className="flex space-x-1 ml-2">
          {!notification.read && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark as read</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete notification</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="mt-2 flex w-full items-center justify-between">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-medium',
            priorityStyles.badge
          )}
        >
          <span className="flex items-center">
            <span className="mr-1">{priorityStyles.icon}</span>
            {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
          </span>
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {getTimeAgo(notification.createdAt)}
        </span>
      </div>

      {/* For team invitations, show accept/decline actions */}
      {notification.type === 'team_invitation' && notification.relatedItemType === 'invitation' && (
        <NotificationActions
          notificationId={notification.id}
          invitationId={notification.relatedItemId || 0}
          inviteToken={notification.actionUrl?.split('/').pop()}
          projectId={parseInt(notification.actionUrl?.split('/')[2] || '0')}
          onClose={() => onMarkAsRead(notification.id)}
        />
      )}

      {/* Add a special case for project_team type notifications */}
      {notification.type === 'project_team' && (
        <div className="mt-3 w-full">
          <Link
            to="/project-invitations"
            className="block w-full"
            onClick={(e) => {
              e.stopPropagation();
              onClick(notification);
            }}
          >
            <Button
              variant="default"
              size="sm"
              className="w-full text-xs flex items-center justify-center"
            >
              <Check className="h-3.5 w-3.5 mr-2" />
              View Team Invitations
            </Button>
          </Link>
        </div>
      )}

      {/* For other notifications with action URLs */}
      {notification.actionUrl && notification.type !== 'team_invitation' && notification.type !== 'project_team' && (
        <div className="mt-3 w-full">
          <Link
            to={notification.actionUrl}
            className="block w-full"
            onClick={(e) => {
              e.stopPropagation();
              onClick(notification);
            }}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs flex items-center justify-center"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}