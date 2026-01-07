/**
 * Shared Event Channels for Pub/Sub communication
 * between Server-API and Realtime-Server
 */

export const EVENT_CHANNELS = {
    // Message events
    MESSAGE_CREATED: 'message.created',
    MESSAGE_READ: 'message.read',
    MESSAGE_DELETED: 'message.deleted',
    MESSAGE_PINNED: 'message.pinned',
    MESSAGE_UNPINNED: 'message.unpinned',

    // Notification events
    NOTIFICATION_SENT: 'notification.sent',

    // User events
    USER_STATUS_CHANGED: 'user.status.changed',
    USER_FRIEND_ONLINE: 'user.friend.online',

    // Post events
    POST_LIKED: 'post.liked',
} as const;

export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS];

// Event payload types
export interface MessageCreatedEvent {
    roomId: string;
    conversationId?: string;
    conversationTitle?: string;
    message: any;
}

export interface MessageReadEvent {
    roomId: string;
    userId: string;
}

export interface MessageDeletedEvent {
    message: any;
}

export interface MessagePinnedEvent {
    message: any;
}

export interface MessageUnpinnedEvent {
    message: any;
}

export interface NotificationSentEvent {
    notification: any;
}

export interface UserStatusChangedEvent {
    userId: string;
    isOnline: boolean;
}

export interface UserFriendOnlineEvent {
    userId: string;
    friend: any;
}

export interface PostLikedEvent {
    postId: string;
    authorId: string;
    userId: string;
    notification?: any;
}
