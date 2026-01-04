import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/config';
import { authMiddleware } from './middlwares/auth.middleware';
import { prepare } from './prepare';
import { SocketManager } from './socket/socket.manager';
import { redisService } from './services/redis.service';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, config.socketOptions);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(config.corsOptions));

io.use(authMiddleware);

prepare(io);

io.on('connection', async (socket) => {
    await SocketManager.handleConnection(socket, io);
});

app.get('/', (req, res) => {
    res.send({
        success: true,
        message: 'Realtime server is running',
    });
});

const server = httpServer.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        console.log('HTTP server closed');

        try {
            // Disconnect Redis
            await redisService.disconnect();
            console.log('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
