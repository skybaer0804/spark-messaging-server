import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateKey } from './middleware/keyValidation.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 3000;
const PROJECT_KEY = process.env.PROJECT_KEY || 'default-project-key-12345';

// Express 미들웨어
app.use(cors());
app.use(express.json());

// 기본 라우트
app.get('/health', validateKey, (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/status', validateKey, (req, res) => {
    res.json({
        status: 'ok',
        server: 'spark-messaging-server',
        version: '1.0.0',
        connectedClients: io.sockets.sockets.size,
    });
});

// Socket.IO 연결 처리
io.use((socket, next) => {
    const clientKey = socket.handshake.auth?.key || socket.handshake.query?.key;

    if (!clientKey) {
        logger.warn('Connection rejected: No key provided', {
            socketId: socket.id,
            ip: socket.handshake.address,
        });
        return next(new Error('Authentication failed: Key is required'));
    }

    if (clientKey !== PROJECT_KEY) {
        logger.warn('Connection rejected: Invalid key', {
            socketId: socket.id,
            ip: socket.handshake.address,
            providedKey: clientKey.substring(0, 5) + '...',
        });
        return next(new Error('Authentication failed: Invalid key'));
    }

    logger.info('Connection authenticated', {
        socketId: socket.id,
        ip: socket.handshake.address,
    });
    next();
});

// Socket 핸들러 설정
setupSocketHandlers(io);

// 에러 핸들러
app.use((err, req, res, next) => {
    logger.error('Express error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// 서버 시작
httpServer.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`, {
        port: PORT,
        projectKey: PROJECT_KEY.substring(0, 10) + '...',
    });
});
