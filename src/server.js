import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';

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

    // Get user
    const currentUser = await User.findById(userId).select('-password');
    currentUser.isOnline = true;
    await currentUser.save();
    if (!currentUser) return;

    // Get friends
    const friends = currentUser.friends.map((friend) => friend._id.toString());

    for (let [id, socket] of io.of('/').sockets) {
        const user = socket.handshake.auth.user;

        if (user && friends.includes(user.id) && user.id !== userId) {
            io.to(id).emit('friend-online', userId);
        }
    }

    /*
        1. A gửi lời mời kết bạn cho B
        1.1. Kiểm tra xem đã là bạn bè chưa
        1.2. Kiểm tra xem đã có lời mời kết bạn chưa
        1.3. Tạo lời mời kết bạn
        1.4. Gửi lời mời kết bạn cho B
        2. B nhận được lời mời kết bạn từ A
        2.1. Xóa lời mời kết bạn
        2.2. Thêm A vào danh sách bạn bè
        2.3. Thêm B vào danh sách bạn bè của A
        2.4. Gửi thông báo cho A
        3. A nhận được thông báo từ B
        3.1. Thêm B vào danh sách bạn bè
        3.2. Gửi thông báo cho B
    */

    sk.on('send-request-add-friend', async ({ receiverId }) => {
        log('SEND REQUEST ADD FRIEND');

        const friendNotification = await Notification.findOne({
            type: 'friend',
            send: receiverId,
            receive: currentUser._id,
        });

        const currentUserNotification = await Notification.findOne({
            type: 'friend',
            send: currentUser._id,
            receive: receiverId,
        });

        if (currentUserNotification) {
            console.log('Bạn đã gửi lời mời kết bạn cho bạn này');
            return;
        }

        // Kiểm tra xem đã có lời mời kết bạn chưa
        if (friendNotification) {
            console.log('Bạn của bạn đã gửi lời mời kết bạn cho bạn');
            return;
        }

        // Kiểm tra xem đã là bạn bè chưa
        if (friends.includes(receiverId)) {
            console.log("You're already friends");
            return;
        }

        const friend = await User.findById(receiverId).select('-password');
        if (!friend) return;

        // Kiểm tra xem đã có lời mời kết bạn chưa
        const oldNotification = await Notification.findOne({
            type: 'friend',
            send: currentUser._id,
            receive: friend._id,
        });

        // Nếu đã có lời mời kết bạn thì xóa lời mời kết bạn và thêm vào danh sách bạn bè
        if (oldNotification) {
            await Notification.findByIdAndDelete(oldNotification._id);
            friend.friends.push(currentUser._id);
            await friend.save();

            currentUser.friends.push(friend._id);
            await currentUser.save();

            friends.push(receiverId);
            return;
        }

        // Tạo lời mời kết bạn
        const newNotification = await Notification({
            type: 'friend',
            send: currentUser._id,
            receive: friend._id,
        });

        await newNotification.save();

        const notification = await Notification.findById(
            newNotification._id
        ).populate('send', '_id name image');

        // Gửi lời mời kết bạn cho B
        for (let [id, socket] of io.of('/').sockets) {
            const userSocket = socket.handshake.auth.user;

            if (userSocket && userSocket.id === friend._id.toString()) {
                io.to(id).emit('receive-request-add-friend', {
                    notification: notification,
                });
            }
        }
    });

    sk.on('accept-request-add-friend', async ({ notificationId, senderId }) => {
        log('ACCEPT REQUEST ADD FRIEND', {
            notificationId,
            senderId,
        });

        // Kiểm tra xem đã là bạn chưa
        if (
            friends.includes(senderId) ||
            currentUser.friends.includes(senderId)
        ) {
            console.log('Đã là bạn bè');
            return;
        }

        currentUser.friends.push(senderId);
        friends.push(senderId);
        await currentUser.save();

        const sender = await User.findById(senderId).select('-password');
        sender.friends.push(currentUser._id);
        await sender.save();

        await Notification.findByIdAndDelete(notificationId);

        for (let [id, socket] of io.of('/').sockets) {
            const user = socket.handshake.auth.user;

            if (user && friends.includes(user.id) && user.id !== userId) {
                io.to(id).emit('friend-online', userId);
            }

            if (user && user.id === senderId) {
                io.to(id).emit('add-friend-success', currentUser);
            }
        }

        sk.emit('add-friend-success', sender);

        // Kiểm tra nếu notification của 2 người đã có thì xóa
        const oldNotification = await Notification.findOne({
            type: 'friend',
            send: senderId,
            receive: currentUser._id,
        });

        if (oldNotification) {
            await Notification.findByIdAndDelete(oldNotification._id);
        }

        const oldNotification2 = await Notification.findOne({
            type: 'friend',
            send: currentUser._id,
            receive: senderId,
        });

        if (oldNotification2) {
            await Notification.findByIdAndDelete(oldNotification2._id);
        }
    });

    sk.on(
        'decline-request-add-friend',
        async ({ notificationId, senderId }) => {
            log('DECLINE REQUEST ADD FRIEND', {
                notificationId,
            });

            // Kiểm tra xem đã là bạn chưa
            if (friends.includes(senderId)) {
                console.log('Đã là bạn bè');
                currentUser.friends.filter((friend) => friend !== senderId);
                await currentUser.save();
            }

            await Notification.findByIdAndDelete(notificationId);

            // Kiểm tra nếu notification của 2 người đã có thì xóa
            const oldNotification = await Notification.findOne({
                type: 'friend',
                send: senderId,
                receive: currentUser._id,
            });

            if (oldNotification) {
                await Notification.findByIdAndDelete(oldNotification._id);
            }

            const oldNotification2 = await Notification.findOne({
                type: 'friend',
                send: currentUser._id,
                receive: senderId,
            });

            if (oldNotification2) {
                await Notification.findByIdAndDelete(oldNotification2._id);
            }
        }
    );

    sk.on('un-friend', async ({ friendId }) => {
        log('UN FRIEND', friendId);

        await User.findByIdAndUpdate(userId, {
            $pull: { friends: friendId },
        });

        await User.findByIdAndUpdate(friendId, {
            $pull: { friends: userId },
        });

        friends.filter((friend) => friend !== friendId);

        for (let [id, socket] of io.of('/').sockets) {
            const user = socket.handshake.auth.user;

            if (user && friends.includes(user.id) && user.id !== userId) {
                io.to(id).emit('friend-online', userId);
            }
        }

        sk.emit('un-friend-success', friendId);
    });

    sk.on('join-room', async ({ roomId }) => {
        log('JOIN ROOM', roomId);
        sk.join(roomId);
    });

    sk.on('read-message', async ({ roomId }) => {
        log('READ MESSAGE', roomId);
        await Message.updateMany(
            { roomId, userId: { $ne: userId } },
            { isRead: true }
        );

        sk.to(roomId).emit('read-message', { roomId, userId: userId });
    });

    sk.on('get-last-messages', async ({ roomId }) => {
        log('GET LAST MESSAGES', roomId);
        const lastMsg = await Message.find({ roomId })
            .sort({ createdAt: -1 })
            .limit(1);

        io.to(roomId).emit('get-last-messages', {
            roomId,
            data: lastMsg[0],
        });
    });

    sk.on('leave-room', ({ roomId }) => {
        log('LEAVE ROOM', roomId);
        sk.leave(roomId);
    });

    sk.on('send-message', (message) => {
        log('SEND MESSAGE');
        const { roomId, text, userId } = message;
        io.to(roomId).emit('receive-message', message);
    });

    sk.on('delete-message', (message) => {
        log('DELETE MESSAGE');
        io.to(message.roomId).emit('delete-message', message);
    });

    sk.on('disconnect', async () => {
        log('A CLIENT DISCONNECTED', sk.id);

        currentUser.isOnline = false;
        currentUser.lastAccessed = new Date();
        await currentUser.save();

        sk.broadcast.emit('user-disconnected', userId);
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
