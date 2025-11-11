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

        // 메시지 수신 및 브로드캐스트 (callback 지원)
        socket.on('message', (data, callback) => {
            try {
                logger.info('Message received', {
                    socketId: socket.id,
                    messageType: data?.type || 'unknown',
                });

                // 메시지 유효성 검사
                if (!data || typeof data !== 'object') {
                    const errorResponse = {
                        success: false,
                        message: 'Invalid message format',
                    };
                    if (typeof callback === 'function') {
                        callback(errorResponse);
                    } else {
                        socket.emit('error', errorResponse);
                    }
                    return;
                }

                // 모든 연결된 클라이언트에게 메시지 브로드캐스트
                const broadcastData = {
                    ...data,
                    from: socket.id,
                    timestamp: new Date().toISOString(),
                };
                io.emit('message', broadcastData);

                logger.debug('Message broadcasted', {
                    socketId: socket.id,
                    recipients: io.sockets.sockets.size,
                });

                // Callback이 있으면 응답 전송
                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        message: 'Message sent successfully',
                        timestamp: new Date().toISOString(),
                    });
                }
            } catch (error) {
                logger.error('Error handling message', {
                    socketId: socket.id,
                    error: error.message,
                });
                const errorResponse = {
                    success: false,
                    message: 'Failed to process message',
                    error: error.message,
                };
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('error', errorResponse);
                }
            }
        });

        // 특정 이벤트 타입별 처리 (callback 지원)
        socket.on('join-room', (roomName, callback) => {
            try {
                socket.join(roomName);
                logger.info('Client joined room', {
                    socketId: socket.id,
                    room: roomName,
                });
                const response = {
                    success: true,
                    room: roomName,
                    message: `Joined room: ${roomName}`,
                };
                socket.emit('joined-room', response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            } catch (error) {
                logger.error('Error joining room', {
                    socketId: socket.id,
                    room: roomName,
                    error: error.message,
                });
                const errorResponse = {
                    success: false,
                    room: roomName,
                    message: 'Failed to join room',
                    error: error.message,
                };
                if (typeof callback === 'function') {
                    callback(errorResponse);
                }
            }
        });

        socket.on('leave-room', (roomName, callback) => {
            try {
                socket.leave(roomName);
                logger.info('Client left room', {
                    socketId: socket.id,
                    room: roomName,
                });
                const response = {
                    success: true,
                    room: roomName,
                    message: `Left room: ${roomName}`,
                };
                socket.emit('left-room', response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            } catch (error) {
                logger.error('Error leaving room', {
                    socketId: socket.id,
                    room: roomName,
                    error: error.message,
                });
                const errorResponse = {
                    success: false,
                    room: roomName,
                    message: 'Failed to leave room',
                    error: error.message,
                };
                if (typeof callback === 'function') {
                    callback(errorResponse);
                }
            }
        });

        // 룸 내 메시지 전송 (callback 지원)
        socket.on('room-message', (data, callback) => {
            try {
                const { room, ...messageData } = data;
                if (!room) {
                    const errorResponse = {
                        success: false,
                        message: 'Room name is required',
                    };
                    if (typeof callback === 'function') {
                        callback(errorResponse);
                    } else {
                        socket.emit('error', errorResponse);
                    }
                    return;
                }

                logger.info('Room message received', {
                    socketId: socket.id,
                    room: room,
                });

                const broadcastData = {
                    ...messageData,
                    from: socket.id,
                    room: room,
                    timestamp: new Date().toISOString(),
                };
                io.to(room).emit('room-message', broadcastData);

                // Callback이 있으면 응답 전송
                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        message: 'Room message sent successfully',
                        room: room,
                        timestamp: new Date().toISOString(),
                    });
                }
            } catch (error) {
                logger.error('Error handling room message', {
                    socketId: socket.id,
                    error: error.message,
                });
                const errorResponse = {
                    success: false,
                    message: 'Failed to process room message',
                    error: error.message,
                };
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('error', errorResponse);
                }
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
