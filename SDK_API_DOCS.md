# Spark Messaging Server - SDK API 문서

이 문서는 Spark Messaging Server의 SDK 개발을 위한 API 명세서입니다.

## 목차

1. [개요](#개요)
2. [연결 및 인증](#연결-및-인증)
3. [이벤트 API](#이벤트-api)
4. [Callback 패턴](#callback-패턴)
5. [에러 처리](#에러-처리)
6. [예제 코드](#예제-코드)

---

## 개요

Spark Messaging Server는 Socket.IO 기반의 실시간 메시징 서버입니다. SDK는 Socket.IO 클라이언트를 사용하여 서버에 연결하고 메시지를 주고받을 수 있습니다.

### 주요 기능

-   실시간 메시지 브로드캐스트
-   룸 기반 메시징
-   프로젝트 키 기반 인증
-   Callback 패턴 지원 (선택사항)

---

## 연결 및 인증

### 서버 연결

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
    transports: ['websocket'],
});
```

### 인증 방법

서버 연결 시 프로젝트 키를 전달해야 합니다. 다음 두 가지 방법을 지원합니다:

#### 방법 1: auth 객체 사용 (권장)

```javascript
const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
});
```

#### 방법 2: Query 파라미터 사용

```javascript
const socket = io('http://localhost:3000?key=your-project-key-here');
```

**주의사항:**

-   URL에 키가 노출되므로 보안상 권장하지 않음
-   로그나 브라우저 히스토리에 키가 남을 수 있음

### 환경별 주의사항

#### Node.js 환경

Node.js 환경에서는 `extraHeaders`가 제대로 작동하지 않을 수 있습니다. 반드시 `auth` 객체를 사용하세요:

```javascript
// ✅ 권장: auth 객체 사용
const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
});

// ❌ 비권장: extraHeaders는 Node.js에서 작동하지 않을 수 있음
const socket = io('http://localhost:3000', {
    extraHeaders: {
        'x-project-key': 'your-project-key-here',
    },
});
```

#### 브라우저 환경

브라우저 환경에서는 `auth` 객체와 `extraHeaders` 모두 사용 가능하지만, `auth` 객체를 권장합니다:

```javascript
// ✅ 권장: auth 객체 사용
const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
});
```

### 연결 확인

```javascript
socket.on('connect', () => {
    console.log('연결 성공!', socket.id);
});

socket.on('connected', (data) => {
    console.log('서버 연결 확인:', data.message);
    console.log('Socket ID:', data.socketId);
});
```

**서버에서 전송하는 `connected` 이벤트:**

```javascript
{
    message: "Connected to server",
    socketId: "socket-id-here",
    timestamp: "2024-01-01T00:00:00.000Z"
}
```

---

## 이벤트 API

### 1. 메시지 전송 및 수신

#### 메시지 전송

```javascript
socket.emit('message', {
    type: 'chat',
    content: 'Hello, World!',
    user: 'user123',
    // 추가 필드 자유롭게 추가 가능
});
```

#### 메시지 수신

```javascript
socket.on('message', (data) => {
    console.log('메시지 수신:', data);
});
```

**수신되는 메시지 형식:**

```javascript
{
    type: 'chat',
    content: 'Hello, World!',
    user: 'user123',
    from: 'socket-id-of-sender',
    timestamp: '2024-01-01T00:00:00.000Z'
}
```

**특징:**

-   전송한 메시지는 서버를 통해 모든 연결된 클라이언트에게 브로드캐스트됩니다
-   자신이 보낸 메시지도 다시 받게 됩니다

---

### 2. 룸 참가 및 나가기

#### 룸 참가

```javascript
socket.emit('join-room', 'room-name');
```

#### 룸 참가 확인

```javascript
socket.on('joined-room', (data) => {
    console.log('룸 참가 성공:', data.message);
    console.log('룸 이름:', data.room);
});
```

**응답 형식:**

```javascript
{
    success: true,
    room: 'room-name',
    message: 'Joined room: room-name'
}
```

#### 룸 나가기

```javascript
socket.emit('leave-room', 'room-name');
```

#### 룸 나가기 확인

```javascript
socket.on('left-room', (data) => {
    console.log('룸 나가기 성공:', data.message);
    console.log('룸 이름:', data.room);
});
```

**응답 형식:**

```javascript
{
    success: true,
    room: 'room-name',
    message: 'Left room: room-name'
}
```

---

### 3. 룸 메시지 전송 및 수신

#### 룸 메시지 전송

```javascript
socket.emit('room-message', {
    room: 'room-name',
    type: 'chat',
    content: 'Hello, Room!',
    // 추가 필드 자유롭게 추가 가능
});
```

**주의:** `room` 필드는 필수입니다.

#### 룸 메시지 수신

```javascript
socket.on('room-message', (data) => {
    console.log('룸 메시지 수신:', data);
});
```

**수신되는 메시지 형식:**

```javascript
{
    room: 'room-name',
    type: 'chat',
    content: 'Hello, Room!',
    from: 'socket-id-of-sender',
    timestamp: '2024-01-01T00:00:00.000Z'
}
```

**특징:**

-   룸 메시지는 해당 룸에 참가한 클라이언트에게만 전달됩니다
-   룸에 참가하지 않은 클라이언트는 메시지를 받지 않습니다

---

## Callback 패턴

모든 이벤트는 선택적으로 callback을 지원합니다. Callback을 사용하면 서버에서 즉시 응답을 받을 수 있습니다.

### 1. 메시지 전송 (Callback 사용)

```javascript
socket.emit(
    'message',
    {
        type: 'chat',
        content: 'Hello!',
    },
    (response) => {
        if (response.success) {
            console.log('메시지 전송 성공:', response.message);
        } else {
            console.error('메시지 전송 실패:', response.message);
        }
    }
);
```

**성공 응답:**

```javascript
{
    success: true,
    message: "Message sent successfully",
    timestamp: "2024-01-01T00:00:00.000Z"
}
```

**실패 응답:**

```javascript
{
    success: false,
    message: "Invalid message format"
}
```

---

### 2. 룸 참가 (Callback 사용)

```javascript
socket.emit('join-room', 'room-name', (response) => {
    if (response.success) {
        console.log('룸 참가 성공:', response.message);
    } else {
        console.error('룸 참가 실패:', response.message);
        console.error('에러:', response.error);
    }
});
```

**성공 응답:**

```javascript
{
    success: true,
    room: 'room-name',
    message: 'Joined room: room-name'
}
```

**실패 응답:**

```javascript
{
    success: false,
    room: 'room-name',
    message: 'Failed to join room',
    error: 'Error details'
}
```

---

### 3. 룸 나가기 (Callback 사용)

```javascript
socket.emit('leave-room', 'room-name', (response) => {
    if (response.success) {
        console.log('룸 나가기 성공:', response.message);
    } else {
        console.error('룸 나가기 실패:', response.message);
    }
});
```

**응답 형식:** `join-room`과 동일

---

### 4. 룸 메시지 전송 (Callback 사용)

```javascript
socket.emit(
    'room-message',
    {
        room: 'room-name',
        type: 'chat',
        content: 'Hello!',
    },
    (response) => {
        if (response.success) {
            console.log('룸 메시지 전송 성공:', response.message);
        } else {
            console.error('룸 메시지 전송 실패:', response.message);
        }
    }
);
```

**성공 응답:**

```javascript
{
    success: true,
    message: "Room message sent successfully",
    room: "room-name",
    timestamp: "2024-01-01T00:00:00.000Z"
}
```

**실패 응답:**

```javascript
{
    success: false,
    message: "Room name is required"
}
```

---

## 에러 처리

### 연결 에러

```javascript
socket.on('connect_error', (error) => {
    console.error('연결 에러:', error.message);
    // 일반적인 원인:
    // - 서버가 실행되지 않음
    // - 잘못된 프로젝트 키
    // - 네트워크 문제
});
```

### 일반 에러

```javascript
socket.on('error', (error) => {
    console.error('에러 발생:', error);
    // 에러 형식:
    // {
    //     success: false,
    //     message: "Error message",
    //     error: "Error details" (선택사항)
    // }
});
```

### 연결 해제

```javascript
socket.on('disconnect', (reason) => {
    console.log('연결 해제:', reason);
    // 일반적인 이유:
    // - "io server disconnect" - 서버에서 연결 종료
    // - "io client disconnect" - 클라이언트에서 연결 종료
    // - "ping timeout" - 네트워크 타임아웃
    // - "transport close" - 전송 계층 종료
});
```

---

## 예제 코드

### 기본 사용 예제

```javascript
import { io } from 'socket.io-client';

// 연결
const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
});

// 연결 성공
socket.on('connect', () => {
    console.log('연결됨:', socket.id);
});

// 서버 연결 확인
socket.on('connected', (data) => {
    console.log('서버 확인:', data.message);
});

// 메시지 수신
socket.on('message', (data) => {
    console.log('메시지:', data.content);
});

// 메시지 전송
function sendMessage(content) {
    socket.emit('message', {
        type: 'chat',
        content: content,
    });
}

// 연결 해제
function disconnect() {
    socket.disconnect();
}
```

---

### Callback 패턴 사용 예제

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
});

// Callback을 사용한 메시지 전송
function sendMessageWithCallback(content) {
    socket.emit(
        'message',
        {
            type: 'chat',
            content: content,
        },
        (response) => {
            if (response.success) {
                console.log('✅ 전송 성공');
            } else {
                console.error('❌ 전송 실패:', response.message);
            }
        }
    );
}

// Callback을 사용한 룸 참가
function joinRoom(roomName) {
    socket.emit('join-room', roomName, (response) => {
        if (response.success) {
            console.log('✅ 룸 참가:', response.room);
        } else {
            console.error('❌ 룸 참가 실패:', response.message);
        }
    });
}
```

---

### 룸 기반 채팅 예제

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
    auth: {
        key: 'your-project-key-here',
    },
});

// 룸 참가
socket.emit('join-room', 'chat-room', (response) => {
    if (response.success) {
        console.log('채팅방 입장 완료');
    }
});

// 룸 메시지 수신
socket.on('room-message', (data) => {
    console.log(`[${data.room}] ${data.content}`);
});

// 룸 메시지 전송
function sendRoomMessage(content) {
    socket.emit(
        'room-message',
        {
            room: 'chat-room',
            type: 'chat',
            content: content,
        },
        (response) => {
            if (response.success) {
                console.log('메시지 전송 완료');
            }
        }
    );
}

// 룸 나가기
function leaveRoom() {
    socket.emit('leave-room', 'chat-room', (response) => {
        if (response.success) {
            console.log('채팅방 나가기 완료');
        }
    });
}
```

---

### Promise 래퍼 예제 (SDK 구현 참고)

SDK에서 Promise 패턴을 사용하고 싶다면 다음과 같이 래핑할 수 있습니다:

```javascript
class SparkMessagingSDK {
    constructor(serverUrl, projectKey) {
        this.socket = io(serverUrl, {
            auth: { key: projectKey },
        });
    }

    // Promise로 래핑된 메시지 전송
    sendMessage(data) {
        return new Promise((resolve, reject) => {
            this.socket.emit('message', data, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.message));
                }
            });
        });
    }

    // Promise로 래핑된 룸 참가
    joinRoom(roomName) {
        return new Promise((resolve, reject) => {
            this.socket.emit('join-room', roomName, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.message));
                }
            });
        });
    }

    // 이벤트 리스너 등록
    onMessage(callback) {
        this.socket.on('message', callback);
    }

    onRoomMessage(callback) {
        this.socket.on('room-message', callback);
    }
}

// 사용 예제
const sdk = new SparkMessagingSDK('http://localhost:3000', 'your-key');

// Promise 사용
try {
    await sdk.sendMessage({ type: 'chat', content: 'Hello!' });
    console.log('전송 성공');
} catch (error) {
    console.error('전송 실패:', error.message);
}

// 이벤트 리스너 사용
sdk.onMessage((data) => {
    console.log('메시지 수신:', data);
});
```

---

## 이벤트 요약

### 클라이언트 → 서버 이벤트

| 이벤트명       | 파라미터                   | Callback 지원 | 설명           |
| -------------- | -------------------------- | ------------- | -------------- |
| `message`      | `data: object`             | ✅            | 메시지 전송    |
| `join-room`    | `roomName: string`         | ✅            | 룸 참가        |
| `leave-room`   | `roomName: string`         | ✅            | 룸 나가기      |
| `room-message` | `data: object` (room 필수) | ✅            | 룸 메시지 전송 |

### 서버 → 클라이언트 이벤트

| 이벤트명       | 데이터 형식                           | 설명           |
| -------------- | ------------------------------------- | -------------- |
| `connected`    | `{ message, socketId, timestamp }`    | 연결 성공 알림 |
| `message`      | `{ ...data, from, timestamp }`        | 메시지 수신    |
| `joined-room`  | `{ success, room, message }`          | 룸 참가 확인   |
| `left-room`    | `{ success, room, message }`          | 룸 나가기 확인 |
| `room-message` | `{ ...data, room, from, timestamp }`  | 룸 메시지 수신 |
| `error`        | `{ success: false, message, error? }` | 에러 발생      |
| `disconnect`   | `reason: string`                      | 연결 해제      |

---

## 주의사항

1. **프로젝트 키**: 서버 연결 시 올바른 프로젝트 키를 사용해야 합니다. 잘못된 키는 연결이 거부됩니다.

2. **룸 메시지**: `room-message` 이벤트를 사용할 때는 반드시 `room` 필드를 포함해야 합니다.

3. **Callback 타임아웃**: Callback은 서버에서 즉시 응답하지만, 네트워크 문제로 인해 지연될 수 있습니다. 타임아웃을 구현하는 것을 권장합니다.

4. **메시지 브로드캐스트**: `message` 이벤트로 전송한 메시지는 모든 연결된 클라이언트에게 브로드캐스트됩니다. 자신이 보낸 메시지도 다시 받게 됩니다.

5. **룸 참가**: 룸에 참가하지 않으면 해당 룸의 메시지를 받을 수 없습니다.

---

## 버전 정보

-   **서버 버전**: 1.0.0
-   **Socket.IO 버전**: 4.7.2
-   **문서 버전**: 1.0.0

---

## 지원 및 문의

문제가 발생하거나 질문이 있으시면 프로젝트 저장소의 Issues를 확인하거나 개발팀에 문의하세요.
