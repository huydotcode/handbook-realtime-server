import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import Participant from './models/Participant.js';
import User from './models/User.js';

const app = express();
const httpServer = createServer(app);
const PORT = 5000;

// fix CORS error
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000', 'https://handbookk.vercel.app'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
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

    // Message
    JOIN_ROOM: 'join-room',
    READ_MESSAGE: 'read-message',
    SEND_MESSAGE: 'send-message',
    RECEIVE_MESSAGE: 'receive-message',
    DELETE_MESSAGE: 'delete-message',
    LEAVE_ROOM: 'leave-room',
};

// @ts-ignore
app.use(express.json({ limit: '5mb' }));
// @ts-ignore
app.use(express.urlencoded({ extended: true }));
// @ts-ignore
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

io.on('connection', async (sk) => {
    log('A CLIENT CONNECTED', sk.id);

    if (!sk.handshake.auth.user) return;

    let userId = sk.handshake.auth.user?.id;
    if (!userId) return;

    const currentUser = await User.findById(userId).select('-password');
    if (!currentUser) return;
    currentUser.isOnline = true;
    await currentUser.save();

    const friends = currentUser.friends;

    for (let [id, socket] of io.of('/').sockets) {
        const user = socket.handshake.auth.user;

        if (user && friends.includes(user.id) && user.id !== userId) {
            io.to(id).emit('friend-online', userId);
        }
    }

    // Tham gia các cuộc hội thoại
    const participantsOfUser = await Participant.find({
        user: currentUser._id,
    });

    const conversations = await Conversation.find({
        participants: {
            $in: participantsOfUser.map((par) => par._id),
        },
    });

    const joinRoom = (conversationId) => {
        if (!chatRooms[conversationId]) {
            chatRooms[conversationId] = new Set();
        }

        log('JOIN ROOM', conversationId.toString());

        if (!chatRooms[conversationId].has(sk.id)) {
            chatRooms[conversationId].add(sk.id);
        }

        sk.join(conversationId);
    };

    for (const conversation of conversations) {
        joinRoom(conversation._id);
    }

    sk.on(socketEvent.SEND_REQUEST_ADD_FRIEND, async ({ request }) => {
        log('SEND REQUEST ADD FRIEND');

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
        log('RECEIVE NOTIFICATION');

        for (let [id, socket] of io.of('/').sockets) {
            const user = socket.handshake.auth.user;

            if (user && user.id === notification.receiver) {
                io.to(id).emit('receive-notification', {
                    notification,
                });
            }
        }
    });

    sk.on(socketEvent.JOIN_ROOM, async ({ roomId, userId }) => {
        console.log({
            roomId,
            userId,
        });
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

        log('JOIN ROOM', roomId);

        if (!chatRooms[roomId].has(sk.id)) {
            chatRooms[roomId].add(sk.id);
        }

        sk.join(roomId);
    });

    sk.on(socketEvent.READ_MESSAGE, async ({ roomId }) => {
        log('READ MESSAGE', roomId);
        await Message.updateMany(
            { roomId, userId: { $ne: userId } },
            { isRead: true }
        );

        sk.to(roomId).emit(socketEvent.READ_MESSAGE, {
            roomId,
            userId: userId,
        });
    });

    sk.on(socketEvent.GET_LAST_MESSAGE, async ({ roomId }) => {
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
        log('LEAVE ROOM', roomId);
        sk.leave(roomId);
    });

    sk.on(socketEvent.SEND_MESSAGE, ({ message, roomId }) => {
        log('SEND MESSAGE');

        io.to(roomId).emit(socketEvent.RECEIVE_MESSAGE, message);
    });

    sk.on(
        socketEvent.DELETE_MESSAGE,
        ({ prevMessage: prevMsg, currentMessage: msg }) => {
            log('DELETE MESSAGE');

            io.to(msg.conversation).emit(socketEvent.DELETE_MESSAGE, {
                prevMsg,
                msg,
            });
        }
    );

    sk.on('disconnect', async () => {
        log('A CLIENT DISCONNECTED', sk.id);

        currentUser.isOnline = false;
        currentUser.lastAccessed = new Date();
        await currentUser.save();

        sk.broadcast.emit('user-disconnected', userId);

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

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Connected to DB');

    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
