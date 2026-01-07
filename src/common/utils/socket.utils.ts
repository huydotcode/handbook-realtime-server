import { Socket } from 'socket.io';
import { userService } from '../../services';

export class SocketUtils {
    /**
     * Gửi notification đến user một cách hiệu quả
     */
    static sendNotificationToUser(
        userId: string,
        notification: any,
        io: any
    ): void {
        try {
            if (!userId || !notification) return;

            const userSockets = userService.getUserSockets(userId);
            if (userSockets) {
                userSockets.forEach((socketId) => {
                    io.to(socketId).emit('receive-notification', {
                        notification,
                    });
                });
            }
        } catch (error) {
            console.error('Error sending notification to user:', error);
        }
    }

    /**
     * Gửi message đến room một cách hiệu quả
     */
    static sendMessageToRoom(roomId: string, message: any, io: any): void {
        try {
            if (!roomId || !message) return;

            io.to(roomId).emit('receive-message', message);
        } catch (error) {
            console.error('Error sending message to room:', error);
        }
    }

    /**
     * Kiểm tra user có quyền truy cập room không
     */
    static async checkUserRoomAccess(
        userId: string,
        roomId: string
    ): Promise<boolean> {
        try {
            // Implement logic kiểm tra quyền truy cập
            return true;
        } catch (error) {
            console.error('Error checking user room access:', error);
            return false;
        }
    }

    /**
     * Validate socket data
     */
    static validateSocketData(data: any, requiredFields: string[]): boolean {
        if (!data) return false;

        for (const field of requiredFields) {
            if (!data[field]) {
                console.log(`Missing required field: ${field}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Get user ID from socket
     */
    static getUserIdFromSocket(socket: Socket): string | null {
        try {
            return socket.handshake.auth.user?.id || null;
        } catch (error) {
            console.error('Error getting user ID from socket:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    static isUserAuthenticated(socket: Socket): boolean {
        try {
            return !!socket.handshake.auth.user?.id;
        } catch (error) {
            console.error('Error checking user authentication:', error);
            return false;
        }
    }
}
