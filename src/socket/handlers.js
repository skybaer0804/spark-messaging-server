import { logger } from '../utils/logger.js';

/**
 * Socket.IO 이벤트 핸들러 설정
 */
export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        logger.info('Client connected', {
            socketId: socket.id,
            totalConnections: io.sockets.sockets.size,
        });

        // 클라이언트에게 연결 성공 알림
        socket.emit('connected', {
            message: 'Connected to server',
            socketId: socket.id,
            timestamp: new Date().toISOString(),
        });

        // 메시지 수신 및 브로드캐스트
        socket.on('message', (data) => {
            try {
                logger.info('Message received', {
                    socketId: socket.id,
                    messageType: data.type || 'unknown',
                });

                // 메시지 유효성 검사
                if (!data || typeof data !== 'object') {
                    socket.emit('error', {
                        message: 'Invalid message format',
                    });
                    return;
                }

                // 모든 연결된 클라이언트에게 메시지 브로드캐스트
                io.emit('message', {
                    ...data,
                    from: socket.id,
                    timestamp: new Date().toISOString(),
                });

                logger.debug('Message broadcasted', {
                    socketId: socket.id,
                    recipients: io.sockets.sockets.size,
                });
            } catch (error) {
                logger.error('Error handling message', {
                    socketId: socket.id,
                    error: error.message,
                });
                socket.emit('error', {
                    message: 'Failed to process message',
                    error: error.message,
                });
            }
        });

        // 특정 이벤트 타입별 처리
        socket.on('join-room', (roomName) => {
            try {
                socket.join(roomName);
                logger.info('Client joined room', {
                    socketId: socket.id,
                    room: roomName,
                });
                socket.emit('joined-room', {
                    room: roomName,
                    message: `Joined room: ${roomName}`,
                });
            } catch (error) {
                logger.error('Error joining room', {
                    socketId: socket.id,
                    room: roomName,
                    error: error.message,
                });
            }
        });

        socket.on('leave-room', (roomName) => {
            try {
                socket.leave(roomName);
                logger.info('Client left room', {
                    socketId: socket.id,
                    room: roomName,
                });
                socket.emit('left-room', {
                    room: roomName,
                    message: `Left room: ${roomName}`,
                });
            } catch (error) {
                logger.error('Error leaving room', {
                    socketId: socket.id,
                    room: roomName,
                    error: error.message,
                });
            }
        });

        // 룸 내 메시지 전송
        socket.on('room-message', (data) => {
            try {
                const { room, ...messageData } = data;
                if (!room) {
                    socket.emit('error', {
                        message: 'Room name is required',
                    });
                    return;
                }

                logger.info('Room message received', {
                    socketId: socket.id,
                    room: room,
                });

                io.to(room).emit('room-message', {
                    ...messageData,
                    from: socket.id,
                    room: room,
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                logger.error('Error handling room message', {
                    socketId: socket.id,
                    error: error.message,
                });
                socket.emit('error', {
                    message: 'Failed to process room message',
                    error: error.message,
                });
            }
        });

        // 연결 해제 처리
        socket.on('disconnect', (reason) => {
            logger.info('Client disconnected', {
                socketId: socket.id,
                reason: reason,
                totalConnections: io.sockets.sockets.size - 1,
            });
        });

        // 에러 처리
        socket.on('error', (error) => {
            logger.error('Socket error', {
                socketId: socket.id,
                error: error.message || error,
            });
        });
    });

    // 서버 레벨 에러 처리
    io.on('error', (error) => {
        logger.error('Socket.IO server error', {
            error: error.message || error,
        });
    });
};
