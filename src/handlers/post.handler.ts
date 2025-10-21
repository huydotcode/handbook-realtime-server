import { Socket } from 'socket.io';
import Notification from '../models/Notification';
import { userService } from '../services';
import { log } from '../utils/logger';
import { socketEvent } from 'src/constants/socketEvents';

export class PostHandler {
    static async handleLikePost(
        socket: Socket,
        io: any,
        data: { postId: string; authorId: string },
        userId: string
    ) {
        const { postId, authorId } = data;

        if (!postId || !authorId || !userId) {
            console.log('POST ID, AUTHOR ID, OR USER ID IS NULL');
            return;
        }

        log(`LIKE POST ${postId} - AUTHOR: ${authorId}`);

        try {
            // Tối ưu: Kiểm tra notification đã tồn tại chưa
            const existNotification = await Notification.findOne({
                type: 'like-post',
                sender: userId,
                receiver: authorId,
            }).lean();

            if (existNotification) return;

            // Tối ưu: Tạo notification mới
            const newNotification = await Notification.create({
                type: 'like-post',
                sender: userId,
                receiver: authorId,
                message: 'đã thích bài viết của bạn',
            });

            // Tối ưu: Sử dụng userService thay vì lặp qua tất cả sockets
            this.sendNotificationToUser(authorId, newNotification, io);
        } catch (error) {
            console.error('Error handling like post:', error);
        }
    }

    // Tối ưu: Helper method để gửi notification đến user
    private static sendNotificationToUser(
        userId: string,
        notification: any,
        io: any
    ): void {
        try {
            const userSockets = userService.getUserSockets(userId);
            if (userSockets) {
                userSockets.forEach((socketId) => {
                    io.to(socketId).emit(socketEvent.RECEIVE_NOTIFICATION, {
                        notification,
                    });
                });
            }
        } catch (error) {
            console.error('Error sending notification to user:', error);
        }
    }
}
