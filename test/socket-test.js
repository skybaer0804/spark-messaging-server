/**
 * Socket.IO 연결 테스트 스크립트
 *
 * 사용법:
 *   1. 먼저 서버를 실행하세요: npm run dev
 *   2. 다른 터미널에서 이 스크립트를 실행: npm run test:socket
 */

import { io } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const PROJECT_KEY = process.env.PROJECT_KEY || 'default-project-key-12345';

console.log('🔌 Socket.IO 연결 테스트 시작...');
console.log(`서버: ${SERVER_URL}`);
console.log(`프로젝트 키: ${PROJECT_KEY.substring(0, 10)}...`);
console.log('\n⚠️  서버가 실행 중인지 확인하세요! (npm run dev)\n');

// Socket 연결
const socket = io(SERVER_URL, {
    auth: {
        key: PROJECT_KEY,
    },
    transports: ['websocket'],
});

// 연결 성공
socket.on('connect', () => {
    console.log('✅ 연결 성공!');
    console.log(`Socket ID: ${socket.id}\n`);

    // 테스트 메시지 전송
    console.log('📤 메시지 전송 중...');
    socket.emit('message', {
        type: 'test',
        content: 'Hello from test client!',
        timestamp: new Date().toISOString(),
    });
});

// 연결 성공 알림 (서버에서 전송)
socket.on('connected', (data) => {
    console.log('📨 서버 연결 확인:', data.message);
    console.log(`Socket ID: ${data.socketId}\n`);
});

// 메시지 수신
socket.on('message', (data) => {
    console.log('📨 메시지 수신:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
});

// 룸 테스트
socket.on('connect', () => {
    setTimeout(() => {
        console.log('🏠 룸 참가 테스트...');
        socket.emit('join-room', 'test-room');

        setTimeout(() => {
            console.log('📤 룸 메시지 전송...');
            socket.emit('room-message', {
                room: 'test-room',
                type: 'room-test',
                content: 'Hello from room!',
            });
        }, 1000);
    }, 1000);
});

socket.on('joined-room', (data) => {
    console.log(`✅ 룸 참가 성공: ${data.room}`);
    console.log(`메시지: ${data.message}\n`);
});

socket.on('room-message', (data) => {
    console.log('📨 룸 메시지 수신:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
});

// 에러 처리
socket.on('error', (error) => {
    console.error('❌ 에러 발생:', error);
});

socket.on('connect_error', (error) => {
    console.error('❌ 연결 에러:', error.message);
    console.error('\n💡 해결 방법:');
    console.error('   1. 서버가 실행 중인지 확인하세요: npm run dev');
    console.error('   2. 서버가 http://localhost:3000 에서 실행 중인지 확인하세요');
    console.error('   3. 프로젝트 키가 일치하는지 확인하세요 (.env 파일의 PROJECT_KEY)\n');
    process.exit(1);
});

// 연결 해제
socket.on('disconnect', (reason) => {
    console.log(`🔌 연결 해제: ${reason}`);
});

// 10초 후 종료 (테스트 시간 연장)
setTimeout(() => {
    console.log('\n👋 테스트 종료...');
    if (socket.connected) {
        socket.disconnect();
    }
    process.exit(0);
}, 10000);
