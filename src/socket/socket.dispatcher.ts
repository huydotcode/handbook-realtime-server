import { Socket } from 'socket.io';
import { socketEvent } from '../common/constants/socket-events';
import {
    MessageHandler,
    NotificationHandler,
    PostHandler,
    VideoCallSocketHandler,
} from '../handlers';

export class SocketDispatcher {
    private videoCallHandler: VideoCallSocketHandler;
    private socket: Socket;
    private io: any;

    constructor(socket: Socket, io: any, userId: string) {
        this.socket = socket;
        this.io = io;
        this.videoCallHandler = new VideoCallSocketHandler(socket, io, userId);
    }

    public attachListeners(): void {
        this.attachNotificationListeners();
        this.attachMessageListeners();
        this.attachPostListeners();
        this.attachVideoCallListeners();
    }

    private attachNotificationListeners(): void {
        this.socket.on(socketEvent.SEND_NOTIFICATION, (data) =>
            this.safeCall(
                NotificationHandler.handleSendNotification,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.RECEIVE_NOTIFICATION, (data) =>
            this.safeCall(
                NotificationHandler.handleReceiveNotification,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.SEND_REQUEST_ADD_FRIEND, (data) =>
            this.safeCall(
                NotificationHandler.handleSendRequestAddFriend,
                this.socket,
                this.io,
                data
            )
        );
    }

    private attachMessageListeners(): void {
        this.socket.on(socketEvent.JOIN_ROOM, (data) =>
            this.safeCall(
                MessageHandler.handleJoinRoom,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(
            socketEvent.LEAVE_ROOM,
            (data) =>
                this.safeCall(MessageHandler.handleLeaveRoom, this.socket, data) // Note: leaveRoom signature might be different
        );

        this.socket.on(socketEvent.SEND_MESSAGE, (data) =>
            this.safeCall(
                MessageHandler.handleSendMessage,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.READ_MESSAGE, (data) =>
            this.safeCall(
                MessageHandler.handleReadMessage,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.GET_LAST_MESSAGE, (data) =>
            this.safeCall(
                MessageHandler.handleGetLastMessage,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.PIN_MESSAGE, (data) =>
            this.safeCall(
                MessageHandler.handlePinMessage,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.UN_PIN_MESSAGE, (data) =>
            this.safeCall(
                MessageHandler.handleUnPinMessage,
                this.socket,
                this.io,
                data
            )
        );

        this.socket.on(socketEvent.DELETE_MESSAGE, (data) =>
            this.safeCall(
                MessageHandler.handleDeleteMessage,
                this.socket,
                this.io,
                data
            )
        );
    }

    private attachPostListeners(): void {
        this.socket.on(socketEvent.LIKE_POST, (data) =>
            this.safeCall(
                PostHandler.handleLikePost,
                this.socket,
                this.io,
                data,
                this.socket.handshake.auth.user?.id
            )
        );
    }

    private attachVideoCallListeners(): void {
        // Video calls use instance methods of videoCallHandler
        this.socket.on(socketEvent.VIDEO_CALL_INITIATE, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleInitiateCall(data),
                'initiate call'
            )
        );

        this.socket.on(socketEvent.VIDEO_CALL_ACCEPT, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleAcceptCall(data),
                'accept call'
            )
        );

        this.socket.on(socketEvent.VIDEO_CALL_REJECT, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleRejectCall(data),
                'reject call'
            )
        );

        this.socket.on(socketEvent.VIDEO_CALL_END, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleEndCall(data),
                'end call'
            )
        );

        this.socket.on(socketEvent.VIDEO_CALL_OFFER, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleOffer(data),
                'WebRTC offer'
            )
        );

        this.socket.on(socketEvent.VIDEO_CALL_ANSWER, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleAnswer(data),
                'WebRTC answer'
            )
        );

        this.socket.on(socketEvent.VIDEO_CALL_ICE_CANDIDATE, (data) =>
            this.safeHandle(
                () => this.videoCallHandler.handleIceCandidate(data),
                'ICE candidate'
            )
        );
    }

    public async handleDisconnect(): Promise<void> {
        await this.safeHandle(
            () => this.videoCallHandler.handleDisconnect(),
            'video call disconnect'
        );
    }

    // Helper to wrap static handler calls with try-catch
    private async safeCall(handler: Function, ...args: any[]) {
        try {
            await handler(...args);
        } catch (error) {
            console.error(`Error in socket handler:`, error);
        }
    }

    // Helper to wrap instance handler calls
    private async safeHandle(
        fn: () => Promise<any> | void,
        actionName: string
    ) {
        try {
            await fn();
        } catch (error) {
            console.error(`Error handling ${actionName}:`, error);
        }
    }
}
