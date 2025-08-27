import { Socket } from 'socket.io';
import { socketEvent } from '../../constants/socketEvents';
import { SocketUtils } from '../../utils/socket.utils';
import { BaseSocketHandler } from './base.handler';
import Notification from '../../models/Notification';

export class PostSocketHandler extends BaseSocketHandler {
    async handle(socket: Socket, io: any, data?: any): Promise<void> {
        // This will be called by the specific event handlers
    }

    async handleLikePost(data: {
        postId: string;
        authorId: string;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['postId', 'authorId'])) {
                this.error('POST ID, AUTHOR ID, OR USER ID IS NULL');
                return;
            }

            const { postId, authorId } = data;
            this.log(`LIKE POST ${postId} - AUTHOR: ${authorId}`);

            // Kiểm tra notification đã tồn tại chưa
            const existNotification = await Notification.findOne({
                type: 'like-post',
                sender: this.userId,
                receiver: authorId,
            }).lean();

            if (existNotification) return;

            // Tạo notification mới
            const newNotification = await Notification.create({
                type: 'like-post',
                sender: this.userId,
                receiver: authorId,
                message: 'đã thích bài viết của bạn',
            });

            // Gửi notification đến user
            SocketUtils.sendNotificationToUser(
                authorId,
                newNotification,
                this.io
            );
        } catch (error) {
            this.error('Error handling like post', error);
        }
    }
}
