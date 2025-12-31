import { Socket } from 'socket.io';
import { log } from '../utils/logger';

export class PostHandler {
    static async handleLikePost(
        socket: Socket,
        io: any,
        data: { postId: string; authorId: string },
        userId: string
    ) {
        // ⚠️ DEPRECATED: This handler is no longer needed
        // Client should call HTTP API: POST /api/posts/:id/interactions
        // Real-time updates will come through event subscription
        console.warn('⚠️ DEPRECATED: handleLikePost - Use HTTP API instead');
        return;
    }

    // Keep this helper method for backward compatibility if needed
    private static sendNotificationToUser(
        userId: string,
        notification: any,
        io: any
    ): void {
        // This method is deprecated
        console.warn('⚠️ DEPRECATED: sendNotificationToUser');
    }
}
