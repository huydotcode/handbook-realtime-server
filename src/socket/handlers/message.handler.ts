import { Socket } from 'socket.io';
import { socketEvent } from '../constants/socketEvents';
import Message from '../../models/Message';
import { chatService } from '../../services/chat.service';
import { MessageData } from '../../types/socket';
import { SocketUtils } from '../../utils/socket.utils';
import { BaseSocketHandler } from './base.handler';

export class MessageSocketHandler extends BaseSocketHandler {
    async handle(socket: Socket, io: any, data?: any): Promise<void> {
        // This will be called by the specific event handlers
    }

    async handleJoinRoom(data: {
        roomId: string;
        userId: string;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['roomId', 'userId'])) {
                this.error('ROOM ID OR USER ID IS NULL');
                return;
            }

            const { roomId, userId } = data;
            this.log(`USERID: ${userId} JOIN ROOM: ${roomId}`);

            chatService.joinRoom(roomId, this.socket.id);
            this.socket.join(roomId);
        } catch (error) {
            this.error('Error handling join room', error);
        }
    }

    async handleLeaveRoom(data: { roomId: string }): Promise<void> {
        try {
            if (!this.validateData(data, ['roomId'])) {
                this.error('ROOM ID IS NULL');
                return;
            }

            const { roomId } = data;
            this.log('LEAVE ROOM', roomId);

            chatService.leaveRoom(roomId, this.socket.id);
            this.socket.leave(roomId);
        } catch (error) {
            this.error('Error handling leave room', error);
        }
    }

    async handleSendMessage(data: {
        message: MessageData;
        roomId: string;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['message', 'roomId'])) {
                this.error('MESSAGE OR ROOM ID IS NULL');
                return;
            }

            const { message, roomId } = data;
            this.log(
                `${message.sender?.name} SEND MESSAGE TO ROOM ${roomId} - TEXT: ${message.text}`
            );

            if (!chatService.isUserInRoom(roomId, this.socket.id)) {
                chatService.joinRoom(roomId, this.socket.id);
                this.socket.join(roomId);
            }

            SocketUtils.sendMessageToRoom(roomId, message, this.io);
        } catch (error) {
            this.error('Error handling send message', error);
        }
    }

    async handleReadMessage(data: {
        roomId: string;
        userId: string;
    }): Promise<void> {
        try {
            if (!this.validateData(data, ['roomId', 'userId'])) {
                this.error('ROOM ID OR USER ID IS NULL');
                return;
            }

            const { roomId, userId } = data;
            this.log('READ MESSAGE', roomId);

            await Message.updateMany(
                {
                    conversation: roomId,
                    readBy: { $not: { $elemMatch: { user: userId } } },
                    sender: { $ne: userId },
                },
                {
                    $push: {
                        readBy: { user: userId },
                    },
                }
            );

            this.socket
                .to(roomId)
                .emit(socketEvent.READ_MESSAGE, { roomId, userId });
        } catch (error) {
            this.error('Error handling read message', error);
        }
    }

    async handleGetLastMessage(data: { roomId: string }): Promise<void> {
        try {
            if (!this.validateData(data, ['roomId'])) {
                this.error('ROOM ID IS NULL');
                return;
            }

            const { roomId } = data;
            this.log('GET LAST MESSAGES', roomId);

            const lastMsg = await Message.find({ conversation: roomId })
                .sort({ createdAt: -1 })
                .limit(1)
                .lean();

            this.io.to(roomId).emit(socketEvent.GET_LAST_MESSAGE, {
                roomId,
                data: lastMsg[0] || null,
            });
        } catch (error) {
            this.error('Error handling get last message', error);
        }
    }

    async handlePinMessage(data: { message: MessageData }): Promise<void> {
        try {
            if (!this.validateData(data, ['message'])) {
                this.error('MESSAGE IS NULL');
                return;
            }

            const { message } = data;
            if (!message?.conversation?._id) {
                this.error('MESSAGE OR CONVERSATION ID IS NULL');
                return;
            }

            this.log(`${message.sender?.name} PIN MESSAGE ${message._id}`);

            this.io
                .to(message.conversation._id.toString())
                .emit(socketEvent.PIN_MESSAGE, message);
        } catch (error) {
            this.error('Error handling pin message', error);
        }
    }

    async handleUnPinMessage(data: { message: MessageData }): Promise<void> {
        try {
            if (!this.validateData(data, ['message'])) {
                this.error('MESSAGE IS NULL');
                return;
            }

            const { message } = data;
            if (!message?.conversation?._id) {
                this.error('MESSAGE OR CONVERSATION ID IS NULL');
                return;
            }

            this.log(`${message.sender?.name} UN PIN MESSAGE ${message._id}`);
            this.io
                .to(message.conversation._id.toString())
                .emit(socketEvent.UN_PIN_MESSAGE, message);
        } catch (error) {
            this.error('Error handling unpin message', error);
        }
    }

    async handleDeleteMessage(data: { message: MessageData }): Promise<void> {
        try {
            if (!this.validateData(data, ['message'])) {
                this.error('MESSAGE IS NULL');
                return;
            }

            const { message } = data;
            if (!message?.conversation?._id) {
                this.error('MESSAGE OR CONVERSATION ID IS NULL');
                return;
            }

            this.log(`${message.sender?.name} DELETE MESSAGE ${message._id}`);

            this.io
                .to(message.conversation._id.toString())
                .emit(socketEvent.DELETE_MESSAGE, message);
        } catch (error) {
            this.error('Error handling delete message', error);
        }
    }
}
