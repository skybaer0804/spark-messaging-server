import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket/handlers.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const origins = ['http://localhost:5173', 'http://localhost:3001'];
const io = new Server(httpServer, {
    cors: {
        origin: origins,
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 3000;
const PROJECT_KEY = process.env.PROJECT_KEY || 'default-project-key-12345';

// Express 미들웨어
app.use(cors());
app.use(express.json());

// 기본 라우트
// 헬스체크용 엔드포인트 (인증 불필요)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// 서버 상태 확인 엔드포인트 (인증 불필요)
app.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        server: 'spark-messaging-server',
        version: '1.0.0',
        connectedClients: io.sockets.sockets.size,
    });
});

// Socket.IO 연결 처리 및 인증
// SDK는 auth 객체를 사용하는 것을 권장합니다 (Node.js 환경 호환성)
// query 파라미터도 지원하지만, 보안상 auth 객체 사용을 권장합니다.
io.use((socket, next) => {
    // auth 객체 우선 사용 (권장), 없으면 query 파라미터 사용
    const authKey = socket.handshake.auth?.key;
    const queryKey = socket.handshake.query?.key;
    const clientKey = authKey || queryKey;
    const authMethod = authKey ? 'auth' : queryKey ? 'query' : null;

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
            authMethod: authMethod,
            providedKey: clientKey.substring(0, 5) + '...',
        });
        return next(new Error('Authentication failed: Invalid key'));
    }

    logger.info('Connection authenticated', {
        socketId: socket.id,
        ip: socket.handshake.address,
        authMethod: authMethod, // 'auth' 또는 'query'
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
