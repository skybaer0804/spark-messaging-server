/**
 * SDK Callback 패턴 테스트 스크립트
 *
 * Socket.IO의 callback 패턴을 테스트합니다.
 * 서버에서 callback을 지원하므로 응답을 받을 수 있습니다.
 */

import { io } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const PROJECT_KEY = process.env.PROJECT_KEY || 'default-project-key-12345';

console.log('🔌 SDK Callback 패턴 테스트 시작...');
console.log(`서버: ${SERVER_URL}`);
console.log(`프로젝트 키: ${PROJECT_KEY.substring(0, 10)}...\n`);

// Socket 연결
const socket = io(SERVER_URL, {
    auth: {
        key: PROJECT_KEY,
    },
    transports: ['websocket'],
});

let testCount = 0;
let completedTests = 0;
const totalTests = 4;

// 연결 성공
socket.on('connect', () => {
    console.log('✅ 연결 성공!');
    console.log(`Socket ID: ${socket.id}\n`);

    // 테스트 1: 메시지 전송 (callback 사용)
    console.log('📤 테스트 1: 메시지 전송 (callback 사용)...');
    socket.emit(
        'message',
        {
            type: 'test',
            content: 'Hello from callback test!',
            timestamp: new Date().toISOString(),
        },
        (response) => {
            completedTests++;
            console.log('✅ Callback 응답 받음:');
            console.log(JSON.stringify(response, null, 2));
            console.log('');

            if (completedTests === totalTests) {
                console.log('✅ 모든 테스트 완료!');
                setTimeout(() => {
                    socket.disconnect();
                    process.exit(0);
                }, 1000);
            }
        }
    );

    // 테스트 2: 룸 참가 (callback 사용)
    setTimeout(() => {
        console.log('📤 테스트 2: 룸 참가 (callback 사용)...');
        socket.emit('join-room', 'test-room', (response) => {
            completedTests++;
            console.log('✅ Callback 응답 받음:');
            console.log(JSON.stringify(response, null, 2));
            console.log('');

            if (completedTests === totalTests) {
                console.log('✅ 모든 테스트 완료!');
                setTimeout(() => {
                    socket.disconnect();
                    process.exit(0);
                }, 1000);
            }
        });
    }, 500);

    // 테스트 3: 룸 메시지 전송 (callback 사용)
    setTimeout(() => {
        console.log('📤 테스트 3: 룸 메시지 전송 (callback 사용)...');
        socket.emit(
            'room-message',
            {
                room: 'test-room',
                type: 'room-test',
                content: 'Hello from room callback!',
            },
            (response) => {
                completedTests++;
                console.log('✅ Callback 응답 받음:');
                console.log(JSON.stringify(response, null, 2));
                console.log('');

                if (completedTests === totalTests) {
                    console.log('✅ 모든 테스트 완료!');
                    setTimeout(() => {
                        socket.disconnect();
                        process.exit(0);
                    }, 1000);
                }
            }
        );
    }, 1000);

    // 테스트 4: 룸 나가기 (callback 사용)
    setTimeout(() => {
        console.log('📤 테스트 4: 룸 나가기 (callback 사용)...');
        socket.emit('leave-room', 'test-room', (response) => {
            completedTests++;
            console.log('✅ Callback 응답 받음:');
            console.log(JSON.stringify(response, null, 2));
            console.log('');

            if (completedTests === totalTests) {
                console.log('✅ 모든 테스트 완료!');
                setTimeout(() => {
                    socket.disconnect();
                    process.exit(0);
                }, 1000);
            }
        });
    }, 1500);
});

// 연결 성공 알림 (서버에서 전송)
socket.on('connected', (data) => {
    console.log('📨 서버 연결 확인:', data.message);
    console.log(`Socket ID: ${data.socketId}\n`);
});

// 메시지 수신 (이벤트 기반)
socket.on('message', (data) => {
    console.log('📨 이벤트로 메시지 수신:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
});

socket.on('joined-room', (data) => {
    console.log('📨 이벤트로 룸 참가 알림:', data.message);
});

socket.on('room-message', (data) => {
    console.log('📨 이벤트로 룸 메시지 수신:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
});

socket.on('left-room', (data) => {
    console.log('📨 이벤트로 룸 나가기 알림:', data.message);
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

// 타임아웃 설정 (30초 후 강제 종료)
setTimeout(() => {
    if (completedTests < totalTests) {
        console.error(`\n❌ 타임아웃: ${completedTests}/${totalTests} 테스트만 완료되었습니다.`);
        console.error('   서버가 callback을 제대로 처리하는지 확인하세요.');
    }
    if (socket.connected) {
        socket.disconnect();
    }
    process.exit(completedTests === totalTests ? 0 : 1);
}, 30000);
