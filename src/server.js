import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Message from './models/Message.js';

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

io.on('connection', async (sk) => {
    log('A CLIENT CONNECTED', sk.id);

    if (!sk.handshake.auth.user) return;
    let userId = sk.handshake.auth.user?.id;
    if (!userId) return;

    console.log('USER ID', userId);

    const user = await User.findById(userId).select('-password');

    if (!user) return;

    let usersIsConnected = [];

    for (let [id, socket] of io.of('/').sockets) {
        const user = socket.handshake.auth.user;

        if (user) {
            usersIsConnected.push({
                socketId: id,
                userId: user.id,
                name: user.name,
                image: user.image,
            });
        }
    }

    log('USERS', usersIsConnected);

    sk.on('disconnect', async () => {
        log('A CLIENT DISCONNECTED', sk.id);
        usersIsConnected = usersIsConnected.filter(
            (user) => user.userId !== userId
        );
        log('USERS AFTER A CLIENT DISCONNECTED', usersIsConnected);
    });

    sk.on('join-room', async ({ roomId }) => {
        console.log('JOIN ROOM');
        await Message.updateMany(
            { roomId, userId: { $ne: sk.user.id } },
            { isRead: true }
        );

        sk.join(roomId);
    });

    sk.on('read-message', ({ roomId }) => {
        console.log('READ MESSAGE');
        sk.to(roomId).emit('read-message', { roomId, userId: sk.user.id });
    });

    sk.on('get-last-messages', async ({ roomId }) => {
        console.log('GET LAST MESSAGE');
        const lastMsg = await Message.find({ roomId })
            .sort({ createdAt: -1 })
            .limit(1);
        sk.emit('get-last-messages', {
            roomId,
            data: lastMsg[0],
        });
    });

    sk.on('leave-room', ({ roomId }) => {
        console.log('LEAVE ROOM');
        sk.leave(roomId);
    });

    sk.on('send-message', (message) => {
        console.log('SEND MESSAGE');
        io.to(message.roomId).emit('receive-message', message);
    });

    sk.on('delete-message', (message) => {
        console.log('DELETE MESSAGE');
        io.to(message.roomId).emit('delete-message', message);
    });

    // sk.on('users', (param) => {
    //     const users = [];

    //     for (let [id, socket] of io.of('/').sockets) {
    //         users.push({
    //             socketId: id,
    //             userId: socket.user.id,
    //             name: socket.user.name,
    //             image: socket.user.image,
    //         });

    //         users.filter((user) => user.userId !== sk.user.id);
    //     }

    //     sk.emit('users', users);
    // });

    sk.on('disconnect', async () => {
        await User.findByIdAndUpdate(sk.user.id, { isOnline: false });

        const users = [];

        for (let [id, socket] of io.of('/').sockets) {
            users.push({
                socketId: id,
                userId: socket.user.id,
                name: socket.user.name,
                image: socket.user.image,
            });

            users.filter((user) => user.userId !== sk.user.id);
        }

        users.filter((user) => user.userId !== sk.user.id);

        sk.broadcast.emit('users', users);
    });

    sk.broadcast.emit('users', usersIsConnected);
});

app.get('/', (req, res) => {
    res.send('Hello everyone change 1!');
});

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Connected to DB');

    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
