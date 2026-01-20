import { Server } from 'socket.io';
import { redisService } from './redis.service';
import { userService } from './user.service';
import { socketEvent } from '../common/constants/socket-events';

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

export let eventSubscriber: EventSubscriber;

export class EventSubscriber {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        eventSubscriber = this; // Expose instance
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        const channels = Object.values(EVENT_CHANNELS);
        channels.forEach((channel) => {
            redisService.subscribe(channel, (message) => {
                try {
                    const data = JSON.parse(message);
                    this.dispatch(channel, data);
                } catch (error) {
                    console.error(
                        `Error parsing message for channel ${channel}:`,
                        error
                    );
                }
            });
        });
    }

    /**
     * Dispatch an event to the appropriate handler.
     * Can be called from Redis subscriber or Internal API.
     */
    public dispatch(channel: string, data: any) {
        console.log(`Dispatching event: ${channel}`);
        switch (channel) {
            case EVENT_CHANNELS.MESSAGE_CREATED:
                this.handleMessageCreated(data);
                break;
            case EVENT_CHANNELS.MESSAGE_READ:
                this.handleMessageRead(data);
                break;
            case EVENT_CHANNELS.MESSAGE_DELETED:
                this.handleMessageDeleted(data);
                break;
            case EVENT_CHANNELS.MESSAGE_PINNED:
                this.handleMessagePinned(data);
                break;
            case EVENT_CHANNELS.MESSAGE_UNPINNED:
                this.handleMessageUnpinned(data);
                break;
            case EVENT_CHANNELS.NOTIFICATION_SENT:
                this.handleNotificationSent(data);
                break;
            case EVENT_CHANNELS.USER_STATUS_CHANGED:
                this.handleUserStatusChanged(data);
                break;
            case EVENT_CHANNELS.POST_LIKED:
                this.handlePostLiked(data);
                break;
            default:
                console.warn(`No handler for channel: ${channel}`);
        }
    }

    private handleMessageCreated(data: any) {
        try {
            const {
                roomId,
                conversationId,
                conversationTitle,
                message: messageData,
            } = data;

            // Prefer flattened conversationId, fallback to roomId
            const targetRoomId = conversationId || roomId;
            if (!targetRoomId) {
                console.warn('MESSAGE_CREATED missing roomId/conversationId');
                return;
            }

            // Normalize payload so client always has conversationId
            const normalizedMessage = {
                ...messageData,
                conversationId: conversationId || roomId,
                conversation: messageData?.conversation || undefined,
            };

            // Attach optional UI-friendly title if provided
            if (conversationTitle && !normalizedMessage.conversation?.title) {
                normalizedMessage.conversation = {
                    ...(normalizedMessage.conversation || {}),
                    title: conversationTitle,
                } as any;
            }

            const roomSize =
                this.io.sockets.adapter.rooms.get(targetRoomId)?.size || 0;

            if (roomSize === 0) {
                console.warn(
                    `Warning: Room ${targetRoomId} is empty! No clients will receive this message.`
                );
            }

            this.io
                .to(targetRoomId)
                .emit(socketEvent.RECEIVE_MESSAGE, normalizedMessage);
        } catch (error) {
            console.error('Error handling MESSAGE_CREATED:', error);
        }
    }

    private handleMessageRead(data: any) {
        try {
            const { roomId, userId } = data;
            console.log(`Received MESSAGE_READ for room ${roomId}`);
            this.io
                .to(roomId)
                .emit(socketEvent.READ_MESSAGE, { roomId, userId });
        } catch (error) {
            console.error('Error handling MESSAGE_READ:', error);
        }
    }

    private handleMessageDeleted(data: any) {
        try {
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

            console.log(`Received MESSAGE_DELETED for room ${roomId}`);
            this.io
                .to(roomId)
                .emit(socketEvent.DELETE_MESSAGE, normalizedMessage);
        } catch (error) {
            console.error('Error handling MESSAGE_DELETED:', error);
        }
    }

    private handleMessagePinned(data: any) {
        try {
            const { message: messageData } = data;
            if (messageData?.conversation?._id) {
                const roomId = messageData.conversation._id.toString();
                console.log(`Received MESSAGE_PINNED for room ${roomId}`);
                this.io.to(roomId).emit(socketEvent.PIN_MESSAGE, messageData);
            }
        } catch (error) {
            console.error('Error handling MESSAGE_PINNED:', error);
        }
    }

    private handleMessageUnpinned(data: any) {
        try {
            const { message: messageData } = data;
            if (messageData?.conversation?._id) {
                const roomId = messageData.conversation._id.toString();
                console.log(`Received MESSAGE_UNPINNED for room ${roomId}`);
                this.io
                    .to(roomId)
                    .emit(socketEvent.UN_PIN_MESSAGE, messageData);
            }
        } catch (error) {
            console.error('Error handling MESSAGE_UNPINNED:', error);
        }
    }

    private handleNotificationSent(data: any) {
        try {
            const { notification } = data;
            const receiverId =
                notification.receiver?._id || notification.receiver;
            console.log(
                `Received NOTIFICATION_SENT to ${receiverId} (type: ${notification.type})`
            );
            this.sendNotificationToUser(receiverId, notification);
        } catch (error) {
            console.error('Error handling NOTIFICATION_SENT:', error);
        }
    }

    private handleUserStatusChanged(data: any) {
        try {
            const { userId, isOnline } = data;
            console.log(
                `Received USER_STATUS_CHANGED: ${userId} - ${isOnline ? 'online' : 'offline'}`
            );
            // Handle user status change if needed (currently logic was empty in original file)
        } catch (error) {
            console.error('Error handling USER_STATUS_CHANGED:', error);
        }
    }

    private handlePostLiked(data: any) {
        try {
            const { authorId, notification } = data;
            console.log(`Received POST_LIKED for author ${authorId} `, {
                notification,
            });
            if (notification) {
                this.sendNotificationToUser(authorId, notification);
            }
        } catch (error) {
            console.error('Error handling POST_LIKED:', error);
        }
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
                `Sent notification to user ${userId} (${userSockets.size} sockets)`
            );
        } else {
            console.log(`User ${userId} has no active sockets`);
        }
    }
}
