import { logger } from '../utils/logger.js';

/**
 * Key 검증 미들웨어
 * Express REST API 라우트에서 사용하는 key 검증 미들웨어
 *
 * 보안을 위해 헤더(x-project-key)만 사용합니다.
 * Query 파라미터나 Body는 사용하지 않습니다.
 *
 * 참고: Socket.IO 연결 인증은 server.js의 io.use()에서 처리하며,
 *       auth 객체(socket.handshake.auth.key) 또는 query 파라미터를 지원합니다.
 */
export const validateKey = (req, res, next) => {
    const clientKey = req.headers['x-project-key'];
    const serverKey = process.env.PROJECT_KEY || 'default-project-key-12345';

    if (!clientKey) {
        logger.warn('Key validation failed: No key provided', {
            ip: req.ip,
            path: req.path,
        });
        return res.status(401).json({
            error: 'Authentication failed',
            message: 'Key is required',
        });
    }

    if (clientKey !== serverKey) {
        logger.warn('Key validation failed: Invalid key', {
            ip: req.ip,
            path: req.path,
            providedKey: clientKey.substring(0, 5) + '...',
        });
        return res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid key',
        });
    }

    logger.debug('Key validation successful', {
        ip: req.ip,
        path: req.path,
    });
    next();
};
