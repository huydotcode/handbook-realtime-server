export const socketEvent = {
    // FRIEND REQUEST
    SEND_NOTIFICATION: 'send-notification',
    SEND_REQUEST_ADD_FRIEND: 'send-request-add-friend',
    ACCEPT_FRIEND: 'accept-friend',
    UN_FRIEND: 'un-friend',

    // FRIEND
    FRIEND_ONLINE: 'friend-online',

    // NOTIFICATION
    RECEIVE_NOTIFICATION: 'receive-notification',

    // POST
    LIKE_POST: 'like-post',

    // MESSAGE
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    SEND_MESSAGE: 'send-message',
    RECEIVE_MESSAGE: 'receive-message',
    READ_MESSAGE: 'read-message',
    DELETE_MESSAGE: 'delete-message',
    PIN_MESSAGE: 'pin-message',
    UN_PIN_MESSAGE: 'un-pin-message',
    GET_LAST_MESSAGE: 'get-last-message',
} as const;

export type SocketEventType = (typeof socketEvent)[keyof typeof socketEvent];
