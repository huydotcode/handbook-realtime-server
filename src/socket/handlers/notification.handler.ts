import { Socket } from 'socket.io';
import { FriendRequestData, NotificationData } from '../../types/socket';
import { SocketUtils } from '../../utils/socket.utils';
import { BaseSocketHandler } from './base.handler';

export class NotificationSocketHandler extends BaseSocketHandler {
    async handle(socket: Socket, io: any, data?: any): Promise<void> {
        // This will be called by the specific event handlers
    }

    async handleSendNotification(data: {
        notification: NotificationData;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['notification'])) {
                this.error('NOTIFICATION IS NULL OR INVALID');
                return;
            }

            const { notification } = data;
            this.log('SEND NOTIFICATION', {
                sendName: notification.sender?.name,
                receiveName: notification.receiver?.name,
            });

            SocketUtils.sendNotificationToUser(
                notification.receiver._id,
                notification,
                this.io
            );
        } catch (error) {
            this.error('Error handling send notification', error);
        }
    }

    async handleReceiveNotification(data: {
        notification: NotificationData;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['notification'])) {
                this.error('NOTIFICATION IS NULL OR INVALID');
                return;
            }

            const { notification } = data;
            this.log('RECEIVE NOTIFICATION', {
                sendName: notification.sender?.name,
                receiveName: notification.receiver?.name,
            });

            SocketUtils.sendNotificationToUser(
                notification.receiver._id,
                notification,
                this.io
            );
        } catch (error) {
            this.error('Error handling receive notification', error);
        }
    }

    async handleSendRequestAddFriend(data: {
        request: FriendRequestData;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['request'])) {
                this.error('REQUEST IS NULL OR INVALID');
                return;
            }

            const { request } = data;
            this.log('SEND REQUEST ADD FRIEND', {
                sendName: request.sender?.name,
                receiveName: request.receiver?.name,
            });

            SocketUtils.sendNotificationToUser(
                request.receiver._id,
                request,
                this.io
            );
        } catch (error) {
            this.error('Error handling send request add friend', error);
        }
    }
}
