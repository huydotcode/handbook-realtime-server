import { Server } from 'socket.io';
import { redisService } from './redis.service';
import { userService } from './user.service';
import { socketEvent } from '../constants/socketEvents';

// Event channels constants
const EVENT_CHANNELS = {
    MESSAGE_CREATED: 'message.created',
    MESSAGE_READ: 'message.read',
    MESSAGE_DELETED: 'message.deleted',
    MESSAGE_PINNED: 'message.pinned',
    MESSAGE_UNPINNED: 'message.unpinned',
    NOTIFICATION_SENT: 'notification.sent',
    USER_STATUS_CHANGED: 'user.status.changed',
    POST_LIKED: 'post.liked',
};

export class EventSubscriber {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        console.log('🎧 Setting up event subscriptions...');

        // Subscribe to message events
        this.subscribeToMessageEvents();

        // Subscribe to notification events
        this.subscribeToNotificationEvents();

        // Subscribe to user events
        this.subscribeToUserEvents();

        // Subscribe to post events
        this.subscribeToPostEvents();

        console.log('✅ Event subscriptions setup complete');
    }

    private subscribeToMessageEvents() {
        // Message created
        redisService.subscribe(EVENT_CHANNELS.MESSAGE_CREATED, (message) => {
            try {
                const data = JSON.parse(message);
                const {
                    roomId,
                    conversationId,
                    conversationTitle,
                    message: messageData,
                } = data;

                // Prefer flattened conversationId, fallback to roomId
                const targetRoomId = conversationId || roomId;
                if (!targetRoomId) {
                    console.warn(
                        'MESSAGE_CREATED missing roomId/conversationId'
                    );
                    return;
                }

                // Normalize payload so client always has conversationId
                const normalizedMessage = {
                    ...messageData,
                    conversationId: conversationId || roomId,
                    conversation: messageData?.conversation || undefined,
                };

                // Attach optional UI-friendly title if provided
                if (
                    conversationTitle &&
                    !normalizedMessage.conversation?.title
                ) {
                    normalizedMessage.conversation = {
                        ...(normalizedMessage.conversation || {}),
                        title: conversationTitle,
                    } as any;
                }

                console.log(
                    `📥 Received MESSAGE_CREATED for room ${targetRoomId}`
                );
                this.io
                    .to(targetRoomId)
                    .emit(socketEvent.RECEIVE_MESSAGE, normalizedMessage);
            } catch (error) {
                console.error('Error handling MESSAGE_CREATED:', error);
            }
        });

        // Message read
        redisService.subscribe(EVENT_CHANNELS.MESSAGE_READ, (message) => {
            try {
                const data = JSON.parse(message);
                const { roomId, userId } = data;

                console.log(`📥 Received MESSAGE_READ for room ${roomId}`);
                this.io
                    .to(roomId)
                    .emit(socketEvent.READ_MESSAGE, { roomId, userId });
            } catch (error) {
                console.error('Error handling MESSAGE_READ:', error);
            }
        });

        // Message deleted
        redisService.subscribe(EVENT_CHANNELS.MESSAGE_DELETED, (message) => {
            try {
                const data = JSON.parse(message);
                const { message: messageData } = data;

                // Accept either populated conversation or flattened id
                const roomId =
                    messageData?.conversation?._id?.toString?.() ||
                    messageData?.conversationId ||
                    (typeof messageData?.conversation === 'string'
                        ? messageData.conversation
                        : undefined);

                if (!roomId) {
                    console.warn('MESSAGE_DELETED missing conversation id');
                    return;
                }

                const normalizedMessage = {
                    ...messageData,
                    conversationId: roomId,
                };

                console.log(`📥 Received MESSAGE_DELETED for room ${roomId}`);
                this.io
                    .to(roomId)
                    .emit(socketEvent.DELETE_MESSAGE, normalizedMessage);
            } catch (error) {
                console.error('Error handling MESSAGE_DELETED:', error);
            }
        });

        // Message pinned
        redisService.subscribe(EVENT_CHANNELS.MESSAGE_PINNED, (message) => {
            try {
                const data = JSON.parse(message);
                const { message: messageData } = data;

                if (messageData?.conversation?._id) {
                    const roomId = messageData.conversation._id.toString();
                    console.log(
                        `📥 Received MESSAGE_PINNED for room ${roomId}`
                    );
                    this.io
                        .to(roomId)
                        .emit(socketEvent.PIN_MESSAGE, messageData);
                }
            } catch (error) {
                console.error('Error handling MESSAGE_PINNED:', error);
            }
        });

        // Message unpinned
        redisService.subscribe(EVENT_CHANNELS.MESSAGE_UNPINNED, (message) => {
            try {
                const data = JSON.parse(message);
                const { message: messageData } = data;

                if (messageData?.conversation?._id) {
                    const roomId = messageData.conversation._id.toString();
                    console.log(
                        `📥 Received MESSAGE_UNPINNED for room ${roomId}`
                    );
                    this.io
                        .to(roomId)
                        .emit(socketEvent.UN_PIN_MESSAGE, messageData);
                }
            } catch (error) {
                console.error('Error handling MESSAGE_UNPINNED:', error);
            }
        });
    }

    private subscribeToNotificationEvents() {
        // All notifications (including friend requests) now use NOTIFICATION_SENT
        redisService.subscribe(EVENT_CHANNELS.NOTIFICATION_SENT, (message) => {
            try {
                const data = JSON.parse(message);
                const { notification } = data;

                const receiverId =
                    notification.receiver?._id || notification.receiver;
                console.log(
                    `📥 Received NOTIFICATION_SENT to ${receiverId} (type: ${notification.type})`
                );
                this.sendNotificationToUser(receiverId, notification);
            } catch (error) {
                console.error('Error handling NOTIFICATION_SENT:', error);
            }
        });
    }

    private subscribeToUserEvents() {
        // User status changed
        redisService.subscribe(
            EVENT_CHANNELS.USER_STATUS_CHANGED,
            (message) => {
                try {
                    const data = JSON.parse(message);
                    const { userId, isOnline } = data;

                    console.log(
                        `📥 Received USER_STATUS_CHANGED: ${userId} - ${isOnline ? 'online' : 'offline'}`
                    );
                    // Handle user status change if needed
                } catch (error) {
                    console.error('Error handling USER_STATUS_CHANGED:', error);
                }
            }
        );
    }

    private subscribeToPostEvents() {
        // Post liked
        redisService.subscribe(EVENT_CHANNELS.POST_LIKED, (message) => {
            try {
                const data = JSON.parse(message);
                const { authorId, notification } = data;

                console.log(`📥 Received POST_LIKED for author ${authorId} `, {
                    notification,
                });
                if (notification) {
                    this.sendNotificationToUser(authorId, notification);
                }
            } catch (error) {
                console.error('Error handling POST_LIKED:', error);
            }
        });
    }

    /**
     * Send notification to a specific user via their socket connections
     */
    private sendNotificationToUser(userId: string, notification: any) {
        const userSockets = userService.getUserSockets(userId);

        if (userSockets && userSockets.size > 0) {
            userSockets.forEach((socketId) => {
                this.io
                    .to(socketId)
                    .emit(socketEvent.RECEIVE_NOTIFICATION, notification);
            });
            console.log(
                `✅ Sent notification to user ${userId} (${userSockets.size} sockets)`
            );
        } else {
            console.log(`⚠️ User ${userId} has no active sockets`);
        }
    }
}
