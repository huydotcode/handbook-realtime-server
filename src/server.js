import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import User from './models/User.js';
import Notification from './models/Notification.js';
import { authMiddleware } from './middlwares/auth.middleware.js';

const app = express();
const httpServer = createServer(app);
const PORT = 5000;

const io = new Server(httpServer, {
    cors: {
        origin: [process.env.CLIENT_HOST, 'http://localhost:3000'],
        credentials: true,
    },
});

const socketEvent = {
    // FRIEND REQUEST
    SEND_REQUEST_ADD_FRIEND: 'send-request-add-friend',
    ACCEPT_FRIEND: 'accept-friend',
    UN_FRIEND: 'un-friend',

    // NOTIFICATION
    RECEIVE_NOTIFICATION: 'receive-notification',

    // POST
    LIKE_POST: 'like-post',

    // Message
    JOIN_ROOM: 'join-room',
    READ_MESSAGE: 'read-message',
    SEND_MESSAGE: 'send-message',
    RECEIVE_MESSAGE: 'receive-message',
    DELETE_MESSAGE: 'delete-message',
    PIN_MESSAGE: 'pin-message',
    LEAVE_ROOM: 'leave-room',
};

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: [process.env.CLIENT_HOST, 'http://localhost:3000'],
    })
);

dotenv.config();

function log(event, data) {
    console.log(
        `\n[${new Date().toLocaleTimeString()}] ${event.toUpperCase()}:`
    );

    if (data) {
        console.log('\tAGRS: ', data);
    }
    console.log('====================================');
}

const chatRooms = {};
const userSockets = new Map();

io.use(authMiddleware);

io.on('connection', async (sk) => {
    log('A CLIENT CONNECTED', sk.id);

    if (!sk.handshake.auth.user) return;

    let userId = sk.handshake.auth.user?.id;
    if (!userId) return;

    if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(sk.id);

    const currentUser = await User.findById(userId).select('-password');
    if (!currentUser) return;
    currentUser.isOnline = true;
    await currentUser.save();

    const friends = currentUser.friends;

    friends.forEach((friendId) => {
        if (userSockets.has(friendId)) {
            userSockets.get(friendId).forEach((socketId) => {
                io.to(socketId).emit('friend-online', userId);
            });
        }
    });

    const conversations = await Conversation.find({
        participants: {
            $elemMatch: { $eq: userId },
        },
    });

    const joinRoom = (conversationId) => {
        if (!chatRooms[conversationId]) {
            chatRooms[conversationId] = new Set();
        }

        log(`${currentUser.name} JOIN ROOM: ${conversationId}`);

        if (!chatRooms[conversationId].has(sk.id)) {
            chatRooms[conversationId].add(sk.id);
        }

        sk.join(conversationId);
    };

    for (const conversation of conversations) {
        joinRoom(conversation._id);
    }

    sk.on(socketEvent.SEND_REQUEST_ADD_FRIEND, async ({ request }) => {
        if (!request) {
            console.log('REQUEST IS NULL');
            return;
        }

        log('SEND REQUEST ADD FRIEND', {
            sendName: request.sender.name,
            receiveName: request.receiver.name,
        });

        // Gửi lời mời kết bạn cho B
        for (let [id, socket] of io.of('/').sockets) {
            const userSocket = socket.handshake.auth.user;

            if (userSocket && userSocket.id === request.receiver._id) {
                io.to(id).emit(socketEvent.RECEIVE_NOTIFICATION, {
                    notification: request,
                });
            }
        }
    });

    sk.on(socketEvent.RECEIVE_NOTIFICATION, async ({ notification }) => {
        if (!notification) {
            console.log('NOTIFICATION IS NULL');
            return;
        }

        log('RECEIVE NOTIFICATION', {
            sendName: notification.sender.name,
            receiveName: notification.receiver,
        });

        for (let [id, socket] of io.of('/').sockets) {
            const user = socket.handshake.auth.user;

            if (user && user.id === notification.receiver._id) {
                io.to(id).emit(socketEvent.RECEIVE_NOTIFICATION, {
                    notification,
                });
            }
        }
    });

    sk.on(socketEvent.JOIN_ROOM, async ({ roomId, userId }) => {
        if (!roomId || !userId) {
            console.log('ROOM ID OR USER ID IS NULL');
            return;
        }

        log(`USERID: ${userId} JOIN ROOM: ${roomId}`);

        if (!chatRooms[roomId]) {
            chatRooms[roomId] = new Set();
        }

        // Add user id vào roomid
        for (let [_, socket] of io.of('/').sockets) {
            const user = socket.handshake.auth.user;

            if (user && user.id === userId) {
                if (!chatRooms[roomId].has(socket.id)) {
                    chatRooms[roomId].add(socket.id);
                }

                socket.join(roomId);
            }
        }

        if (!chatRooms[roomId].has(sk.id)) {
            chatRooms[roomId].add(sk.id);
        }

        sk.join(roomId);
    });

    sk.on(socketEvent.READ_MESSAGE, async ({ roomId, userId }) => {
        if (!roomId || !userId) {
            console.log('ROOM ID OR USER ID IS NULL');
            return;
        }

        log('READ MESSAGE', roomId);

        await Message.updateMany(
            { conversation: roomId, isRead: false },
            {
                $set: {
                    isRead: true,
                },
            }
        );

        sk.to(roomId).emit(socketEvent.READ_MESSAGE, {
            roomId,
            userId,
        });
    });

    sk.on(socketEvent.GET_LAST_MESSAGE, async ({ roomId }) => {
        if (!roomId) {
            console.log('ROOM ID IS NULL');
            return;
        }

        log('GET LAST MESSAGES', roomId);

        const lastMsg = await Message.find({ roomId })
            .sort({ createdAt: -1 })
            .limit(1);

        io.to(roomId).emit(socketEvent.GET_LAST_MESSAGE, {
            roomId,
            data: lastMsg[0],
        });
    });

    sk.on(socketEvent.LEAVE_ROOM, ({ roomId }) => {
        if (!roomId) {
            console.log('ROOM ID IS NULL');
            return;
        }

        log('LEAVE ROOM', roomId);
        sk.leave(roomId);
    });

    sk.on(socketEvent.SEND_MESSAGE, ({ message, roomId }) => {
        if (!message || !roomId) {
            console.log('MESSAGE OR ROOM ID IS NULL');
            return;
        }

        log(
            `${message.sender.name} SEND MESSAGE TO ROOM ${roomId} - TEXT: ${message.text}`
        );

        // Kiểm tra user đã join room chưa
        if (!chatRooms[roomId]) {
            console.log("CREATE NEW ROOM'S SET");
            chatRooms[roomId] = new Set();
        }

        // Add user id vào roomid
        if (!chatRooms[roomId].has(sk.id)) {
            console.log("ADD USER'S SOCKET ID TO ROOM");
            chatRooms[roomId].add(sk.id);
            sk.join(roomId);
        }

        io.to(roomId).emit(socketEvent.RECEIVE_MESSAGE, message);
    });

    sk.on(socketEvent.PIN_MESSAGE, ({ message }) => {
        log(`${message.sender.name} PIN MESSAGE ${message._id}`);

        io.to(message.conversation._id).emit(socketEvent.PIN_MESSAGE, message);
    });

    sk.on(socketEvent.DELETE_MESSAGE, ({ message }) => {
        log(`${message.sender.name} DELETE MESSAGE ${message._id}`);

        io.to(message.conversation._id).emit(
            socketEvent.DELETE_MESSAGE,
            message
        );
    });

    sk.on(socketEvent.LIKE_POST, async ({ postId, authorId }) => {
        log(`LIKE POST ${postId} - AUTHOR: ${authorId}`);

        try {
            const existNotification = await Notification.findOne({
                type: 'like-post',
                sender: userId,
                receiver: authorId,
            });

            if (existNotification) return;

            const newNotification = await Notification.create({
                type: 'like-post',
                sender: userId,
                receiver: authorId,
                message: 'đã thích bài viết của bạn',
            });

            for (let [id, socket] of io.of('/').sockets) {
                const user = socket.handshake.auth.user;

                if (user && user.id === authorId) {
                    io.to(id).emit(socketEvent.RECEIVE_NOTIFICATION, {
                        notification: newNotification,
                    });
                }
            }
        } catch (error) {
            console.log(error);
        }
    });

    sk.on('disconnect', async () => {
        log('A CLIENT DISCONNECTED', sk.id);

        currentUser.isOnline = false;
        currentUser.lastAccessed = new Date();
        await currentUser.save();

        sk.broadcast.emit('user-disconnected', userId);

        if (userSockets.has(userId)) {
            userSockets.get(userId).delete(sk.id);
            if (userSockets.get(userId).size === 0) {
                userSockets.delete(userId);
            }
        }

        for (const roomId in chatRooms) {
            if (chatRooms[roomId].has(sk.id)) {
                chatRooms[roomId].delete(sk.id);
            }
        }
    });
});

app.get('/', (req, res) => {
    res.send('Hello everyone change 2!');
});

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to DB');

        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log('Failed to connect to DB:', error);
        process.exit(1);
    });
