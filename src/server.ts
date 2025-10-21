import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { authMiddleware } from './middlwares/auth.middleware';
import { redisService, videoCallService } from './services';
import { SocketManager } from './socket/socket.manager';
import { config } from './config/config';
import { cronRun } from './cron/cron.handler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, config.socketOptions);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(config.corsOptions));

// Khởi tạo Redis service
redisService.getClient();

io.use(authMiddleware);

io.on('connection', async (socket) => {
    await SocketManager.handleConnection(socket, io);
});

app.get('/', (req, res) => {
    res.send('Hello world');
});

// Periodic cleanup for video calls
setInterval(() => {
    videoCallService.cleanupExpiredCalls();
}, 30000); // Run every 30 seconds

console.log({
    config,
});

cronRun();

mongoose
    .connect(config.mongodbUri)
    .then(() => {
        console.log('Connected to DB');

        httpServer.listen(config.port, () => {
            console.log(`Server is running on port ${config.port}`);
        });
    })
    .catch((error) => {
        console.log('Failed to connect to DB:', error);
        process.exit(1);
    });
