import { Socket } from 'socket.io';

export interface UserSocket {
    userId: string;
    socketId: string;
}

export interface ChatRoom {
    [roomId: string]: Set<string>;
}

export type UserSockets = Map<string, Set<string>>;

export interface SocketAuth {
    user?: {
        id: string;
        name?: string;
    };
}

export interface MessageData {
    _id: string;
    text: string;
    sender: {
        _id: string;
        name: string;
    };
    conversation: {
        _id: string;
    };
}

export interface NotificationData {
    _id: string;
    type: string;
    sender: {
        _id: string;
        name: string;
    };
    receiver: {
        _id: string;
        name: string;
    };
    message?: string;
}

export interface FriendRequestData {
    _id: string;
    sender: {
        _id: string;
        name: string;
    };
    receiver: {
        _id: string;
        name: string;
    };
}

// Event Payloads
export interface JoinRoomData {
    roomId: string;
    userId: string;
}

export interface SendMessageData {
    message: MessageData;
    roomId: string;
}

export interface ReadMessageData {
    roomId: string;
    userId: string;
}
