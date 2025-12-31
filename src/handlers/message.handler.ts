import { Socket } from 'socket.io';
import { socketEvent } from '../constants/socketEvents';
import Message from '../models/Message';
import { chatService } from '../services/chat.service';
import { MessageData } from '../types/socket';
import { log } from '../utils/logger';
import { SocketUtils } from '../utils/socket.utils';

export class MessageHandler {
    static handleJoinRoom(
        socket: Socket,
        io: any,
        data: { roomId: string; userId: string }
    ) {
        if (!SocketUtils.validateSocketData(data, ['roomId', 'userId'])) {
            console.log('ROOM ID OR USER ID IS NULL');
            return;
        }

        const { roomId, userId } = data;
        log(`USERID: ${userId} JOIN ROOM: ${roomId}`);

        // Tối ưu: Chỉ join room cho socket hiện tại
        chatService.joinRoom(roomId, socket.id);
        socket.join(roomId);
    }

    static handleLeaveRoom(socket: Socket, data: { roomId: string }) {
        if (!SocketUtils.validateSocketData(data, ['roomId'])) {
            console.log('ROOM ID IS NULL');
            return;
        }

        const { roomId } = data;
        log('LEAVE ROOM', roomId);
        chatService.leaveRoom(roomId, socket.id);
        socket.leave(roomId);
    }

    static handleSendMessage(
        socket: Socket,
        io: any,
        data: { message: MessageData; roomId: string }
    ) {
        if (!SocketUtils.validateSocketData(data, ['message', 'roomId'])) {
            console.log('MESSAGE OR ROOM ID IS NULL');
            return;
        }

        const { message, roomId } = data;
        log(
            `${message.sender?.name} SEND MESSAGE TO ROOM ${roomId} - TEXT: ${message.text}`
        );

        // Tối ưu: Kiểm tra và join room nếu cần
        if (!chatService.isUserInRoom(roomId, socket.id)) {
            chatService.joinRoom(roomId, socket.id);
            socket.join(roomId);
        }

        // Tối ưu: Sử dụng SocketUtils
        SocketUtils.sendMessageToRoom(roomId, message, io);
    }

    static async handleReadMessage(
        socket: Socket,
        io: any,
        data: { roomId: string; userId: string }
    ) {
        // ⚠️ DEPRECATED: This handler is no longer needed
        // Client should call HTTP API: PATCH /api/messages/:roomId/read
        // Real-time updates will come through event subscription
        console.warn('⚠️ DEPRECATED: handleReadMessage - Use HTTP API instead');
        return;
    }

    static async handleGetLastMessage(
        socket: Socket,
        io: any,
        data: { roomId: string }
    ) {
        // ⚠️ DEPRECATED: This handler should not query DB
        // Client should call HTTP API: GET /api/messages/conversation/:id
        // Consider removing this handler completely
        console.warn(
            '⚠️ DEPRECATED: handleGetLastMessage - Use HTTP API instead'
        );
        return;
    }

    static handlePinMessage(
        socket: Socket,
        io: any,
        data: { message: MessageData }
    ) {
        if (!SocketUtils.validateSocketData(data, ['message'])) {
            console.log('MESSAGE IS NULL');
            return;
        }

        const { message } = data;
        if (!message?.conversation?._id) {
            console.log('MESSAGE OR CONVERSATION ID IS NULL');
            return;
        }

        log(`${message.sender?.name} PIN MESSAGE ${message._id}`);

        io.to(message.conversation._id.toString()).emit(
            socketEvent.PIN_MESSAGE,
            message
        );
    }

    static handleUnPinMessage(
        socket: Socket,
        io: any,
        data: { message: MessageData }
    ) {
        if (!SocketUtils.validateSocketData(data, ['message'])) {
            console.log('MESSAGE IS NULL');
            return;
        }

        const { message } = data;
        if (!message?.conversation?._id) {
            console.log('MESSAGE OR CONVERSATION ID IS NULL');
            return;
        }

        log(`${message.sender?.name} UN PIN MESSAGE ${message._id}`);
        io.to(message.conversation._id.toString()).emit(
            socketEvent.UN_PIN_MESSAGE,
            message
        );
    }

    static handleDeleteMessage(
        socket: Socket,
        io: any,
        data: { message: MessageData }
    ) {
        if (!SocketUtils.validateSocketData(data, ['message'])) {
            console.log('MESSAGE IS NULL');
            return;
        }

        const { message } = data;
        if (!message?.conversation?._id) {
            console.log('MESSAGE OR CONVERSATION ID IS NULL');
            return;
        }

        log(`${message.sender?.name} DELETE MESSAGE ${message._id}`);

        io.to(message.conversation._id.toString()).emit(
            socketEvent.DELETE_MESSAGE,
            message
        );
    }
}
