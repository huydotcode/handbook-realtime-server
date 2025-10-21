import { Socket } from 'socket.io';
import { socketEvent } from 'src/constants/socketEvents';
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
        if (!SocketUtils.validateSocketData(data, ['roomId', 'userId'])) {
            console.log('ROOM ID OR USER ID IS NULL');
            return;
        }

        const { roomId, userId } = data;
        log('READ MESSAGE', roomId);

        try {
            await Message.updateMany(
                {
                    conversation: roomId,
                    readBy: { $not: { $elemMatch: { user: userId } } },
                    sender: {
                        $ne: userId,
                    },
                },
                {
                    $push: {
                        readBy: {
                            user: userId,
                        },
                    },
                }
            );

            socket.to(roomId).emit(socketEvent.READ_MESSAGE, {
                roomId,
                userId,
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    static async handleGetLastMessage(
        socket: Socket,
        io: any,
        data: { roomId: string }
    ) {
        if (!SocketUtils.validateSocketData(data, ['roomId'])) {
            console.log('ROOM ID IS NULL');
            return;
        }

        const { roomId } = data;
        log('GET LAST MESSAGES', roomId);

        try {
            const lastMsg = await Message.find({ conversation: roomId })
                .sort({ createdAt: -1 })
                .limit(1)
                .lean();

            io.to(roomId).emit(socketEvent.GET_LAST_MESSAGE, {
                roomId,
                data: lastMsg[0] || null,
            });
        } catch (error) {
            console.error('Error getting last message:', error);
        }
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
