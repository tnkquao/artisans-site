import { InsertNotification } from '@shared/schema';
import { storage } from '../storage';

// Define notification priority levels
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low' | 'info';

// Define notification types for better TypeScript support
export type NotificationType = 
  | 'project'
  | 'project_team'
  | 'order'
  | 'message'
  | 'service_request'
  | 'payment'
  | 'bid'
  | 'invitation'
  | 'project_update'
  | 'schedule_change'
  | 'material_request'
  | 'inventory'
  | 'system';

// Define the base notification interface with required properties
interface NotificationBase {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  relatedItemId?: number;
  relatedItemType?: string;
  actionUrl?: string;
}

// Create a type map for notification contexts
type ContextualEmojis = {
  [key in NotificationType]: {
    default: string;
    urgent?: string;
    high?: string;
    normal?: string;
    low?: string;
    info?: string;
    [key: string]: string | undefined;
  }
};

// Define contextual emojis for different notification types
const contextualEmojis: ContextualEmojis = {
  project: {
    default: '🏗️',
    urgent: '🚨',
    high: '🏗️',
    normal: '🏗️',
    low: '📝',
    info: 'ℹ️',
    created: '🆕',
    completed: '✅',
    updated: '🔄'
  },
  project_team: {
    default: '👥',
    urgent: '🚨',
    joined: '👋',
    left: '👋',
    added: '➕',
    removed: '➖'
  },
  order: {
    default: '📦',
    urgent: '🚨',
    placed: '🛒',
    shipped: '🚚',
    delivered: '📬',
    cancelled: '❌',
    payment_failed: '💳'
  },
  message: {
    default: '💬',
    urgent: '‼️',
    high: '❗',
    normal: '💬',
    unread: '📨'
  },
  service_request: {
    default: '🔧',
    urgent: '🆘',
    high: '🚩',
    approved: '✅',
    rejected: '❌',
    updated: '🔄'
  },
  payment: {
    default: '💰',
    urgent: '⚠️',
    completed: '✅',
    failed: '❌',
    refunded: '↩️'
  },
  bid: {
    default: '📝',
    new: '🆕',
    accepted: '✅',
    rejected: '❌',
    withdrawn: '🔙'
  },
  invitation: {
    default: '📩',
    sent: '📤',
    accepted: '✅',
    declined: '❌',
    expired: '⏱️'
  },
  project_update: {
    default: '🔄',
    urgent: '🚨',
    milestone: '🏁',
    delay: '⏱️',
    issue: '⚠️'
  },
  schedule_change: {
    default: '📅',
    urgent: '⚠️',
    delayed: '⏰',
    advanced: '⏩'
  },
  material_request: {
    default: '🧱',
    approved: '✅',
    rejected: '❌',
    urgent: '🚨',
    delayed: '⏱️'
  },
  system: {
    default: '🖥️',
    urgent: '🚨',
    maintenance: '🔧',
    update: '🔄',
    security: '🔒'
  },
  inventory: {
    default: '📦',
    urgent: '⚠️',
    low: '⚠️',
    critical: '🚨',
    restock: '🔄',
    out_of_stock: '❌'
  }
};

// Define rules for priority assignment based on notification type and context
const priorityRules: Record<NotificationType, Record<string, NotificationPriority>> = {
  project: {
    default: 'normal',
    created: 'normal',
    updated: 'normal',
    issue: 'high',
    delay: 'high',
    risk: 'high',
    completed: 'normal',
    milestone: 'normal',
    budget_exceeded: 'urgent'
  },
  project_team: {
    default: 'normal',
    joined: 'normal',
    left: 'normal',
    removed: 'high'
  },
  order: {
    default: 'normal',
    placed: 'normal',
    shipped: 'normal',
    delivered: 'normal',
    cancelled: 'high',
    payment_failed: 'urgent',
    delayed: 'high'
  },
  message: {
    default: 'normal',
    from_client: 'high',
    from_admin: 'high'
  },
  service_request: {
    default: 'normal',
    new: 'normal',
    urgent: 'urgent',
    updated: 'normal',
    approved: 'high',
    rejected: 'high',
    connected: 'normal'
  },
  payment: {
    default: 'normal',
    due: 'high',
    overdue: 'urgent',
    completed: 'normal',
    failed: 'urgent',
    refunded: 'high'
  },
  bid: {
    default: 'normal',
    new: 'high',
    accepted: 'high',
    rejected: 'normal',
    countered: 'high',
    expired: 'low'
  },
  invitation: {
    default: 'normal',
    sent: 'normal',
    accepted: 'normal',
    declined: 'normal',
    expired: 'low'
  },
  project_update: {
    default: 'normal',
    milestone: 'normal',
    delay: 'high',
    issue: 'high',
    budget_update: 'high'
  },
  schedule_change: {
    default: 'normal',
    minor: 'low',
    major: 'high',
    urgent: 'urgent'
  },
  material_request: {
    default: 'normal',
    new: 'normal',
    approved: 'normal',
    rejected: 'high',
    urgent: 'urgent'
  },
  system: {
    default: 'normal',
    maintenance: 'normal',
    update: 'low',
    security: 'urgent',
    downtime: 'high'
  },
  inventory: {
    default: 'normal',
    low: 'high',
    critical: 'urgent',
    out_of_stock: 'urgent',
    restock: 'normal'
  }
};

// Context detection patterns with weights (higher = stronger match)
const contextPatterns: Record<string, { regex: RegExp, weight: number }[]> = {
  // Project-related patterns
  'created': [{ regex: /new\s+project|project\s+created|started\s+a\s+project/i, weight: 10 }],
  'updated': [{ regex: /updated|modified|changed|revised|edited/i, weight: 8 }],
  'completed': [{ regex: /completed|finished|done|concluded|accomplished/i, weight: 10 }],
  'milestone': [{ regex: /milestone|achievement|checkpoint|phase\s+complete/i, weight: 10 }],
  'delay': [{ regex: /delay|postponed|late|behind\s+schedule|setback/i, weight: 10 }],
  'issue': [{ regex: /issue|problem|error|fault|defect|concern/i, weight: 10 }],
  'risk': [{ regex: /risk|hazard|danger|warning|threat|vulnerability/i, weight: 10 }],
  
  // Team-related patterns
  'joined': [{ regex: /joined|added\s+to\s+team|new\s+member|team\s+joined/i, weight: 10 }],
  'left': [{ regex: /left|departed|exited|resigned|quit/i, weight: 10 }],
  'added': [{ regex: /\badded\b|\bincluded\b|assigned/i, weight: 9 }],
  'removed': [{ regex: /removed|excluded|deleted|taken\s+off/i, weight: 10 }],
  
  // Order-related patterns
  'placed': [{ regex: /placed|ordered|requested|purchased/i, weight: 10 }],
  'shipped': [{ regex: /shipped|dispatched|sent|on\s+the\s+way/i, weight: 10 }],
  'delivered': [{ regex: /delivered|received|arrived|reached/i, weight: 10 }],
  'cancelled': [{ regex: /cancelled|canceled|terminated|revoked|nullified/i, weight: 10 }],
  
  // Payment-related patterns
  'payment_failed': [{ regex: /payment\s+failed|transaction\s+declined|charge\s+declined/i, weight: 10 }],
  'due': [{ regex: /\bdue\b|\bowing\b|to\s+be\s+paid/i, weight: 10 }],
  'overdue': [{ regex: /overdue|past\s+due|late\s+payment|missed\s+payment/i, weight: 10 }],
  'refunded': [{ regex: /refunded|money\s+back|reimbursed|returned\s+funds/i, weight: 10 }],
  
  // Urgency patterns
  'urgent': [{ regex: /urgent|immediate|critical|asap|emergency/i, weight: 11 }],
  
  // Status change patterns
  'approved': [{ regex: /approved|accepted|confirmed|verified|validated/i, weight: 9 }],
  'rejected': [{ regex: /rejected|declined|denied|refused|disapproved/i, weight: 10 }],
  'expired': [{ regex: /expired|lapsed|ran\s+out|no\s+longer\s+valid/i, weight: 9 }],
  
  // System patterns
  'security': [{ regex: /security|breach|vulnerability|unauthorized|hacked|compromised/i, weight: 11 }],
  'maintenance': [{ regex: /maintenance|upgrade|update|downtime|server|system/i, weight: 8 }],
  'connected': [{ regex: /connected|linked|associated|joined/i, weight: 7 }],
  
  // Budget patterns
  'budget_exceeded': [{ regex: /budget\s+exceeded|over\s+budget|cost\s+overrun/i, weight: 10 }],
  'budget_update': [{ regex: /budget\s+update|cost\s+adjustment|financial\s+update/i, weight: 8 }],
  
  // General patterns for fallback
  'new': [{ regex: /\bnew\b|\brecent\b|\bjust\b|\blatest\b/i, weight: 6 }],
};

// Extract context from notification message with improved pattern matching
function extractContext(type: NotificationType, message: string): string {
  let bestMatch: { context: string, weight: number } = { context: 'default', weight: 0 };
  
  // For each possible context
  for (const [context, patterns] of Object.entries(contextPatterns)) {
    // Check each pattern for this context
    for (const pattern of patterns) {
      if (pattern.regex.test(message) && pattern.weight > bestMatch.weight) {
        bestMatch = { context, weight: pattern.weight };
      }
    }
  }
  
  // Special case: if it's urgent, prioritize that regardless of type
  if (bestMatch.context === 'urgent') {
    return 'urgent';
  }
  
  // Check if we have context-specific rules for this notification type
  if (priorityRules[type]?.[bestMatch.context]) {
    return bestMatch.context;
  }
  
  // If we found a match but it doesn't have specific rules for this notification type,
  // fall back to default for this type
  return 'default';
}

/**
 * Creates a notification with smart contextual priority and emoji indicators
 * @param notification Base notification data without priority or emoji
 * @param context Optional explicit context, otherwise extracted from message
 * @param forceEmoji Optional emoji to use instead of automatically determined one
 * @param forcePriority Optional priority to use instead of automatically determined one
 * @returns The created notification with ID and createdAt timestamp
 */
export async function createSmartNotification(
  notification: NotificationBase,
  context?: string,
  forceEmoji?: string,
  forcePriority?: NotificationPriority
): Promise<any> {
  // Extract context from message if not explicitly provided
  const extractedContext = context || extractContext(notification.type, notification.message);
  
  // Determine priority based on type and context
  const priority = forcePriority || 
    (priorityRules[notification.type]?.[extractedContext] || 
     priorityRules[notification.type]?.default || 
     'normal');
  
  // Determine emoji based on type, context and priority
  const emoji = forceEmoji || 
    (contextualEmojis[notification.type]?.[extractedContext] || 
     contextualEmojis[notification.type]?.[priority] || 
     contextualEmojis[notification.type]?.default || 
     '📢');
  
  // Create the notification with smart priority and emoji
  return storage.createNotification({
    ...notification,
    priority,
    emoji
  });
}

/**
 * Creates an urgent notification with appropriate visual indicators
 * @param notification Base notification data
 * @returns The created urgent notification
 */
export async function createUrgentNotification(notification: NotificationBase): Promise<any> {
  return createSmartNotification(notification, undefined, '🚨', 'urgent');
}

/**
 * Creates a batch of notifications for multiple users with the same content
 * @param userIds Array of user IDs to notify
 * @param notification Base notification data without userId
 * @param context Optional context for priority and emoji determination
 * @returns Array of created notifications
 */
export async function notifyMultipleUsers(
  userIds: number[],
  notification: Omit<NotificationBase, 'userId'>,
  context?: string
): Promise<any[]> {
  const notifications = [];
  
  for (const userId of userIds) {
    const created = await createSmartNotification({
      ...notification,
      userId
    }, context);
    
    notifications.push(created);
  }
  
  return notifications;
}

/**
 * Creates a project notification with appropriate emoji and priority
 * @param notification Project notification data
 * @param context Specific project context (created, updated, issue, etc.)
 * @returns The created notification
 */
export async function createProjectNotification(
  notification: Omit<NotificationBase, 'type'> & { projectId: number }, 
  context: string
): Promise<any> {
  return createSmartNotification({
    ...notification,
    type: 'project',
    relatedItemType: 'project',
    relatedItemId: notification.projectId
  }, context);
}

/**
 * Creates a notification for a new message with smart priority based on message content
 * @param userId The ID of the user to notify
 * @param senderName Name of the message sender
 * @param projectName Optional project name if message is related to a project
 * @param messageContent Content of the message (used for context detection)
 * @param messageId ID of the message
 * @param projectId Optional project ID if message is related to a project
 * @returns The created notification
 */
export async function createMessageNotification(
  userId: number,
  senderName: string,
  messageContent: string,
  messageId: number,
  projectId?: number,
  projectName?: string
): Promise<any> {
  // Detect if message might be urgent based on content
  const isUrgent = /urgent|asap|emergency|critical|immediately/i.test(messageContent);
  
  const title = projectName 
    ? `New message about ${projectName}`
    : `New message from ${senderName}`;
    
  const context = isUrgent ? 'urgent' : 'default';
  
  return createSmartNotification({
    userId,
    title,
    message: messageContent.length > 80 
      ? `${messageContent.substring(0, 80)}...` 
      : messageContent,
    type: 'message',
    relatedItemId: messageId,
    relatedItemType: 'message',
    actionUrl: projectId ? `/projects/${projectId}/messages` : '/messages'
  }, context);
}

/**
 * Creates a notification for order status changes
 * @param notification Base notification data without type and emoji
 * @param orderStatus Current status of the order
 * @returns The created notification
 */
export async function createOrderStatusNotification(
  notification: Omit<NotificationBase, 'type'> & { orderId: number, orderStatus: string }
): Promise<any> {
  // Map order status to appropriate context
  const contextMap: Record<string, string> = {
    'processing': 'placed',
    'in_transit': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'delayed': 'delayed',
    'payment_failed': 'payment_failed'
  };
  
  const context = contextMap[notification.orderStatus] || 'default';
  
  return createSmartNotification({
    ...notification,
    type: 'order',
    relatedItemType: 'order',
    relatedItemId: notification.orderId,
    actionUrl: `/orders/${notification.orderId}`
  }, context);
}

/**
 * Creates a notification for payment events with smart priority
 * @param notification Base notification data without type
 * @param paymentStatus Status of the payment (completed, failed, due, overdue)
 * @returns The created notification
 */
export async function createPaymentNotification(
  notification: Omit<NotificationBase, 'type'> & { paymentId: number, paymentStatus: string }
): Promise<any> {
  return createSmartNotification({
    ...notification,
    type: 'payment',
    relatedItemType: 'payment',
    relatedItemId: notification.paymentId,
    actionUrl: `/payments/${notification.paymentId}`
  }, notification.paymentStatus);
}

/**
 * Creates a notification for a material running low in inventory
 * @param userId User ID to notify (usually supplier or admin)
 * @param materialName Name of the material
 * @param materialId ID of the material
 * @param currentQuantity Current quantity available
 * @param lowThreshold Threshold that triggers the low inventory alert
 * @returns The created notification
 */
export async function createLowInventoryNotification(
  userId: number,
  materialName: string,
  materialId: number,
  currentQuantity: number,
  lowThreshold: number
): Promise<any> {
  // Determine priority based on how low the inventory is
  const criticallyLow = currentQuantity <= Math.floor(lowThreshold * 0.3);
  const context = criticallyLow ? 'urgent' : 'default';
  
  return createSmartNotification({
    userId,
    title: criticallyLow ? 'Critical Inventory Alert' : 'Low Inventory Warning',
    message: `${materialName} inventory is running low (${currentQuantity} ${currentQuantity === 1 ? 'unit' : 'units'} remaining)`,
    type: 'inventory',
    relatedItemType: 'material',
    relatedItemId: materialId,
    actionUrl: `/materials/${materialId}`
  }, context);
}