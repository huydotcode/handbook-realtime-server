import { Socket } from 'socket.io';
import { socketEvent } from '../constants/socketEvents';
import {
    NotificationSocketHandler,
    MessageSocketHandler,
    PostSocketHandler,
} from './handlers';

export class SocketHandlerManager {
    private notificationHandler: NotificationSocketHandler;
    private messageHandler: MessageSocketHandler;
    private postHandler: PostSocketHandler;

    constructor(socket: Socket, io: any, userId: string) {
        this.notificationHandler = new NotificationSocketHandler(
            socket,
            io,
            userId
        );
        this.messageHandler = new MessageSocketHandler(socket, io, userId);
        this.postHandler = new PostSocketHandler(socket, io, userId);
    }

    setupEventListeners(socket: Socket, io: any): void {
        // Notification events
        socket.on(socketEvent.SEND_NOTIFICATION, async (data) => {
            try {
                await this.notificationHandler.handleSendNotification(data);
            } catch (error) {
                console.error('Error handling send notification:', error);
            }
        });

        socket.on(socketEvent.RECEIVE_NOTIFICATION, async (data) => {
            try {
                await this.notificationHandler.handleReceiveNotification(data);
            } catch (error) {
                console.error('Error handling receive notification:', error);
            }
        });

        socket.on(socketEvent.SEND_REQUEST_ADD_FRIEND, async (data) => {
            try {
                await this.notificationHandler.handleSendRequestAddFriend(data);
            } catch (error) {
                console.error('Error handling send request add friend:', error);
            }
        });

        // Message events
        socket.on(socketEvent.JOIN_ROOM, async (data) => {
            try {
                await this.messageHandler.handleJoinRoom(data);
            } catch (error) {
                console.error('Error handling join room:', error);
            }
        });

        socket.on(socketEvent.LEAVE_ROOM, async (data) => {
            try {
                await this.messageHandler.handleLeaveRoom(data);
            } catch (error) {
                console.error('Error handling leave room:', error);
            }
        });

        socket.on(socketEvent.SEND_MESSAGE, async (data) => {
            try {
                await this.messageHandler.handleSendMessage(data);
            } catch (error) {
                console.error('Error handling send message:', error);
            }
        });

        socket.on(socketEvent.READ_MESSAGE, async (data) => {
            try {
                await this.messageHandler.handleReadMessage(data);
            } catch (error) {
                console.error('Error handling read message:', error);
            }
        });

        socket.on(socketEvent.GET_LAST_MESSAGE, async (data) => {
            try {
                await this.messageHandler.handleGetLastMessage(data);
            } catch (error) {
                console.error('Error handling get last message:', error);
            }
        });

        socket.on(socketEvent.PIN_MESSAGE, async (data) => {
            try {
                await this.messageHandler.handlePinMessage(data);
            } catch (error) {
                console.error('Error handling pin message:', error);
            }
        });

        socket.on(socketEvent.UN_PIN_MESSAGE, async (data) => {
            try {
                await this.messageHandler.handleUnPinMessage(data);
            } catch (error) {
                console.error('Error handling unpin message:', error);
            }
        });

        socket.on(socketEvent.DELETE_MESSAGE, async (data) => {
            try {
                await this.messageHandler.handleDeleteMessage(data);
            } catch (error) {
                console.error('Error handling delete message:', error);
            }
        });

        // Post events
        socket.on(socketEvent.LIKE_POST, async (data) => {
            try {
                await this.postHandler.handleLikePost(data);
            } catch (error) {
                console.error('Error handling like post:', error);
            }
        });
    }
}
