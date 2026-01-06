import { Socket } from 'socket.io';
import { socketEvent } from '../constants/socketEvents';
import { chatService, userService } from '../services';
import { log } from '../utils/logger';
import { SocketDispatcher } from './socket.dispatcher';

export class SocketManager {
    static async handleConnection(socket: Socket, io: any) {
        try {
            log('A CLIENT CONNECTED', socket.id);

            const userId = this.getUserId(socket);
            if (!userId) return;

            await this.initializeSession(socket, userId, io);
            this.setupDispatcher(socket, io, userId);
            this.setupSystemEvents(socket, userId);
        } catch (error) {
            console.error('Error handling connection:', error);
        }
    }

    private static getUserId(socket: Socket): string | null {
        if (!socket.handshake.auth.user) {
            console.log('No user authentication found');
            return null;
        }

        const userId = socket.handshake.auth.user?.id;
        if (!userId) {
            console.log('No user ID found');
            return null;
        }
        return userId;
    }

    private static async initializeSession(
        socket: Socket,
        userId: string,
        io: any
    ) {
        // Add user socket
        userService.addUserSocket(userId, socket.id);

        // Update user online status
        await userService.updateUserOnlineStatus(userId, true);

        // Notify friends that user is online
        await userService.notifyFriendsOnline(userId, io);

        // Join user to their conversations
        await this.joinUserToConversations(socket, userId);
    }

    private static setupDispatcher(socket: Socket, io: any, userId: string) {
        const socketDispatcher = new SocketDispatcher(socket, io, userId);
        socketDispatcher.attachListeners();

        // Attach dispatcher to socket for later retrieval if needed (e.g. for disconnect)
        (socket as any).dispatcher = socketDispatcher;
    }

    private static setupSystemEvents(socket: Socket, userId: string) {
        socket.on(socketEvent.HEARTBEAT, async () => {
            await userService.updateUserOnlineStatus(userId, true);
        });

        socket.on('disconnect', async () => {
            await this.handleDisconnect(socket, userId);
        });
    }

    private static async joinUserToConversations(
        socket: Socket,
        userId: string
    ): Promise<void> {
        try {
            const conversations =
                await chatService.getUserConversations(userId);
            for (const conversation of conversations) {
                const conversationId = conversation._id.toString();
                chatService.joinRoom(conversationId, socket.id);
                socket.join(conversationId);
            }
        } catch (error) {
            console.error('Error joining user to conversations:', error);
        }
    }

    static async handleDisconnect(socket: Socket, userId: string) {
        try {
            log('A CLIENT DISCONNECTED', socket.id);

            const dispatcher = (socket as any).dispatcher;
            // Handle video call disconnect first
            if (dispatcher) {
                await dispatcher.handleDisconnect();
            }

            // Update user offline status
            await userService.updateUserOnlineStatus(userId, false);

            // Notify other users
            socket.broadcast.emit('user-disconnected', userId);

            // Remove user socket
            userService.removeUserSocket(userId, socket.id);

            // Cleanup empty rooms
            chatService.cleanupEmptyRooms();
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    }
}
