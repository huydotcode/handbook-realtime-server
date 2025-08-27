import { Socket } from 'socket.io';
import { FriendRequestData, NotificationData } from '../types/socket';
import { log } from '../utils/logger';
import { SocketUtils } from '../utils/socket.utils';

export class NotificationHandler {
    static handleSendNotification(
        socket: Socket,
        io: any,
        data: { notification: NotificationData }
    ) {
        const { notification } = data;

        if (!SocketUtils.validateSocketData(data, ['notification'])) {
            console.log('NOTIFICATION IS NULL OR INVALID');
            return;
        }

        log('SEND NOTIFICATION', {
            sendName: notification.sender?.name,
            receiveName: notification.receiver?.name,
        });

        // Tối ưu: Sử dụng SocketUtils
        SocketUtils.sendNotificationToUser(
            notification.receiver._id,
            notification,
            io
        );
    }

    static handleReceiveNotification(
        socket: Socket,
        io: any,
        data: { notification: NotificationData }
    ) {
        const { notification } = data;

        if (!SocketUtils.validateSocketData(data, ['notification'])) {
            console.log('NOTIFICATION IS NULL OR INVALID');
            return;
        }

        log('RECEIVE NOTIFICATION', {
            sendName: notification.sender?.name,
            receiveName: notification.receiver?.name,
        });

        // Tối ưu: Sử dụng SocketUtils
        SocketUtils.sendNotificationToUser(
            notification.receiver._id,
            notification,
            io
        );
    }

    static handleSendRequestAddFriend(
        socket: Socket,
        io: any,
        data: { request: FriendRequestData }
    ) {
        const { request } = data;

        if (!SocketUtils.validateSocketData(data, ['request'])) {
            console.log('REQUEST IS NULL OR INVALID');
            return;
        }

        log('SEND REQUEST ADD FRIEND', {
            sendName: request.sender?.name,
            receiveName: request.receiver?.name,
        });

        // Tối ưu: Sử dụng SocketUtils
        SocketUtils.sendNotificationToUser(request.receiver._id, request, io);
    }
}
