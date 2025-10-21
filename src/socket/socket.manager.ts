import { Socket } from 'socket.io';
import { socketEvent } from 'src/constants/socketEvents';
import { chatService, userService } from '../services';
import { log } from '../utils/logger';
import { SocketHandlerManager } from './handler.manager';

export class SocketManager {
    static async handleConnection(socket: Socket, io: any) {
        try {
            log('A CLIENT CONNECTED', socket.id);

            if (!socket.handshake.auth.user) {
                console.log('No user authentication found');
                return;
            }

            const userId = socket.handshake.auth.user?.id;
            if (!userId) {
                console.log('No user ID found');
                return;
            }

            // Add user socket
            userService.addUserSocket(userId, socket.id);

            // Update user online status
            await userService.updateUserOnlineStatus(userId, true);

            // Notify friends that user is online
            await userService.notifyFriendsOnline(userId, io);

            // Join user to their conversations
            await this.joinUserToConversations(socket, userId);

            // Setup event listeners using SocketHandlerManager
            const handlerManager = new SocketHandlerManager(socket, io, userId);
            handlerManager.setupEventListeners(socket, io);

            socket.on(socketEvent.HEARTBEAT, async () => {
                await userService.updateUserOnlineStatus(userId, true);
            });

            // Setup disconnect event
            socket.on('disconnect', async () => {
                try {
                    await this.handleDisconnect(socket, userId, handlerManager);
                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            });
        } catch (error) {
            console.error('Error handling connection:', error);
        }
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

    static async handleDisconnect(
        socket: Socket,
        userId: string,
        handlerManager?: any
    ) {
        try {
            log('A CLIENT DISCONNECTED', socket.id);

            // Handle video call disconnect first
            if (handlerManager) {
                await handlerManager.handleDisconnect();
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
