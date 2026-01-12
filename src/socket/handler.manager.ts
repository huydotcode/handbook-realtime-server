import { Socket } from 'socket.io';
import { socketEvent } from '../common/constants/socket-events';
import {
    MessageHandler,
    NotificationHandler,
    PostHandler,
    VideoCallSocketHandler,
} from '../handlers';

export class SocketHandlerManager {
    private videoCallHandler: VideoCallSocketHandler;

    constructor(socket: Socket, io: any, userId: string) {
        this.videoCallHandler = new VideoCallSocketHandler(socket, io, userId);
    }

    setupEventListeners(socket: Socket, io: any): void {
        // Notification events
        socket.on(socketEvent.SEND_NOTIFICATION, async (data) => {
            try {
                await NotificationHandler.handleSendNotification(
                    socket,
                    io,
                    data
                );
            } catch (error) {
                console.error('Error handling send notification:', error);
            }
        });

        socket.on(socketEvent.RECEIVE_NOTIFICATION, async (data) => {
            try {
                await NotificationHandler.handleReceiveNotification(
                    socket,
                    io,
                    data
                );
            } catch (error) {
                console.error('Error handling receive notification:', error);
            }
        });

        socket.on(socketEvent.SEND_REQUEST_ADD_FRIEND, async (data) => {
            try {
                await NotificationHandler.handleSendRequestAddFriend(
                    socket,
                    io,
                    data
                );
            } catch (error) {
                console.error('Error handling send request add friend:', error);
            }
        });

        // Message events
        socket.on(socketEvent.JOIN_ROOM, async (data) => {
            try {
                MessageHandler.handleJoinRoom(socket, io, data);
            } catch (error) {
                console.error('Error handling join room:', error);
            }
        });

        socket.on(socketEvent.LEAVE_ROOM, async (data) => {
            try {
                MessageHandler.handleLeaveRoom(socket, data);
            } catch (error) {
                console.error('Error handling leave room:', error);
            }
        });

        socket.on(socketEvent.SEND_MESSAGE, async (data) => {
            try {
                await MessageHandler.handleSendMessage(socket, io, data);
            } catch (error) {
                console.error('Error handling send message:', error);
            }
        });

        socket.on(socketEvent.READ_MESSAGE, async (data) => {
            try {
                await MessageHandler.handleReadMessage(socket, io, data);
            } catch (error) {
                console.error('Error handling read message:', error);
            }
        });

        socket.on(socketEvent.GET_LAST_MESSAGE, async (data) => {
            try {
                await MessageHandler.handleGetLastMessage(socket, io, data);
            } catch (error) {
                console.error('Error handling get last message:', error);
            }
        });

        socket.on(socketEvent.PIN_MESSAGE, async (data) => {
            try {
                await MessageHandler.handlePinMessage(socket, io, data);
            } catch (error) {
                console.error('Error handling pin message:', error);
            }
        });

        socket.on(socketEvent.UN_PIN_MESSAGE, async (data) => {
            try {
                await MessageHandler.handleUnPinMessage(socket, io, data);
            } catch (error) {
                console.error('Error handling unpin message:', error);
            }
        });

        socket.on(socketEvent.DELETE_MESSAGE, async (data) => {
            try {
                await MessageHandler.handleDeleteMessage(socket, io, data);
            } catch (error) {
                console.error('Error handling delete message:', error);
            }
        });

        // Post events
        socket.on(socketEvent.LIKE_POST, async (data) => {
            try {
                await PostHandler.handleLikePost(
                    socket,
                    io,
                    data,
                    socket.handshake.auth.user?.id
                );
            } catch (error) {
                console.error('Error handling like post:', error);
            }
        });

        // Video Call events
        socket.on(socketEvent.VIDEO_CALL_INITIATE, async (data) => {
            try {
                await this.videoCallHandler.handleInitiateCall(data);
            } catch (error) {
                console.error('Error handling initiate call:', error);
            }
        });

        socket.on(socketEvent.VIDEO_CALL_ACCEPT, async (data) => {
            try {
                await this.videoCallHandler.handleAcceptCall(data);
            } catch (error) {
                console.error('Error handling accept call:', error);
            }
        });

        socket.on(socketEvent.VIDEO_CALL_REJECT, async (data) => {
            try {
                await this.videoCallHandler.handleRejectCall(data);
            } catch (error) {
                console.error('Error handling reject call:', error);
            }
        });

        socket.on(socketEvent.VIDEO_CALL_END, async (data) => {
            try {
                await this.videoCallHandler.handleEndCall(data);
            } catch (error) {
                console.error('Error handling end call:', error);
            }
        });

        socket.on(socketEvent.VIDEO_CALL_OFFER, async (data) => {
            try {
                await this.videoCallHandler.handleOffer(data);
            } catch (error) {
                console.error('Error handling WebRTC offer:', error);
            }
        });

        socket.on(socketEvent.VIDEO_CALL_ANSWER, async (data) => {
            try {
                await this.videoCallHandler.handleAnswer(data);
            } catch (error) {
                console.error('Error handling WebRTC answer:', error);
            }
        });

        socket.on(socketEvent.VIDEO_CALL_ICE_CANDIDATE, async (data) => {
            try {
                await this.videoCallHandler.handleIceCandidate(data);
            } catch (error) {
                console.error('Error handling ICE candidate:', error);
            }
        });
    }

    /**
     * Handle user disconnect for all handlers
     */
    async handleDisconnect(): Promise<void> {
        try {
            await this.videoCallHandler.handleDisconnect();
        } catch (error) {
            console.error('Error handling video call disconnect:', error);
        }
    }
}
