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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, config.socketOptions);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(config.corsOptions));

io.use(authMiddleware);

prepare();

io.on('connection', async (socket) => {
    await SocketManager.handleConnection(socket, io);
});

app.get('/', (req, res) => {
    res.send({
        success: true,
        message: 'Realtime server is running',
    });
});

httpServer.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
