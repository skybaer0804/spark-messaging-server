# Spark Messaging Server - 기술 문서

이 문서는 Spark Messaging Server 프로젝트의 기술 스택, 아키텍처, 이벤트 흐름 등 모든 기술적 세부사항을 다룹니다.

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [아키텍처](#아키텍처)
4. [프로젝트 구조](#프로젝트-구조)
5. [모듈별 상세 설명](#모듈별-상세-설명)
6. [이벤트 흐름](#이벤트-흐름)
7. [데이터 흐름](#데이터-흐름)
8. [보안](#보안)
9. [확장성 및 최적화](#확장성-및-최적화)
10. [학습 가이드](#학습-가이드)

---

## 프로젝트 개요

### 목적

Spark Messaging Server는 실시간 메시징을 위한 백엔드 서버입니다. Socket.IO를 활용하여 클라이언트 간 실시간 통신을 제공하며, SDK 개발을 위한 간단하고 확장 가능한 구조를 제공합니다.

### 핵심 기능

-   **실시간 메시징**: Socket.IO 기반 양방향 통신
-   **룸 기반 메시징**: 특정 그룹에 메시지 전송
-   **인증 시스템**: 프로젝트 키 기반 인증
-   **RESTful API**: 서버 상태 확인 및 모니터링
-   **Callback 패턴**: 즉시 응답을 받을 수 있는 패턴 지원

---

## 기술 스택

### 런타임 및 언어

-   **Node.js**: JavaScript 런타임 환경
-   **ES Modules (ESM)**: `"type": "module"`로 설정된 모던 JavaScript 모듈 시스템

### 핵심 라이브러리

#### 1. Express.js (v4.18.2)

-   **역할**: HTTP 서버 프레임워크
-   **사용 목적**:
    -   RESTful API 엔드포인트 제공 (`/health`, `/status`)
    -   HTTP 요청 처리 및 미들웨어 파이프라인
    -   에러 핸들링

#### 2. Socket.IO (v4.7.2)

-   **역할**: 실시간 양방향 통신 라이브러리
-   **사용 목적**:
    -   WebSocket 기반 실시간 통신
    -   이벤트 기반 메시징 시스템
    -   룸(Room) 관리 및 브로드캐스트

**주요 기능:**

-   WebSocket 연결 관리
-   이벤트 기반 통신 (`emit`, `on`)
-   룸(Room) 기능 (`join`, `leave`)
-   Callback 패턴 지원

#### 3. CORS (v2.8.5)

-   **역할**: Cross-Origin Resource Sharing 처리
-   **사용 목적**: 다른 도메인에서의 요청 허용

#### 4. dotenv (v16.3.1)

-   **역할**: 환경 변수 관리
-   **사용 목적**: `.env` 파일에서 환경 변수 로드

### 개발 도구

-   **socket.io-client (v4.7.2)**: 테스트용 클라이언트 라이브러리
-   **nodemon (v3.1.10)**: 개발 시 자동 재시작 (현재는 `node --watch` 사용)

---

## 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (SDK)                       │
│              Socket.IO Client / HTTP Client             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP / WebSocket
                     │
┌────────────────────▼────────────────────────────────────┐
│              Express.js HTTP Server                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Express Middleware Stack                        │   │
│  │  - CORS                                          │   │
│  │  - JSON Parser                                   │   │
│  │  - Key Validation (Optional)                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  REST API Routes                                 │   │
│  │  - GET /health                                   │   │
│  │  - GET /status                                   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Socket.IO Integration
                     │
┌────────────────────▼────────────────────────────────────┐
│              Socket.IO Server                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Connection Middleware (io.use)                  │   │
│  │  - Key Authentication                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Event Handlers (socket.on)                      │   │
│  │  - message                                       │   │
│  │  - join-room                                     │   │
│  │  - leave-room                                    │   │
│  │  - room-message                                  │   │
│  │  - disconnect                                    │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Event Processing
                     │
┌────────────────────▼────────────────────────────────────┐
│              핵심 로직 레이어                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Message Broadcasting                            │   │
│  │  - Global Broadcast (io.emit)                    │   │
│  │  - Room Broadcast (io.to(room).emit)             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Logger                                          │   │
│  │  - DEBUG, INFO, WARN, ERROR                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 레이어 구조

#### 1. **프레젠테이션 레이어 (Presentation Layer)**

-   Express.js HTTP 서버
-   REST API 엔드포인트
-   CORS 및 미들웨어 처리

#### 2. **통신 레이어 (Communication Layer)**

-   Socket.IO 서버
-   WebSocket 연결 관리
-   이벤트 라우팅

#### 3. **비즈니스 로직 레이어 (Business Logic Layer)**

-   메시지 처리 로직
-   룸 관리
-   인증 및 검증

#### 4. **유틸리티 레이어 (Utility Layer)**

-   로깅 시스템
-   에러 처리
-   환경 변수 관리

---

## 프로젝트 구조

```
spark-messaging-server/
├── src/                          # 소스 코드
│   ├── server.js                 # 메인 서버 파일
│   ├── middleware/               # Express 미들웨어
│   │   └── keyValidation.js      # Key 검증 미들웨어
│   ├── socket/                   # Socket.IO 핸들러
│   │   └── handlers.js           # 이벤트 핸들러
│   └── utils/                    # 유틸리티
│       └── logger.js             # 로깅 유틸리티
├── test/                         # 테스트 파일
│   ├── api.http                  # REST Client 테스트
│   ├── socket-test.js            # Socket.IO 테스트
│   └── sdk-callback-test.js      # Callback 패턴 테스트
├── package.json                  # 프로젝트 설정
├── env.example                   # 환경 변수 예제
├── SDK_API_DOCS.md               # SDK API 문서
├── TEST_GUIDE.md                 # 테스트 가이드
├── TECHNICAL_DOCS.md             # 기술 문서 (현재 파일)
└── README.md                     # 프로젝트 README
```

---

## 모듈별 상세 설명

### 1. `src/server.js` - 메인 서버 파일

**역할**: 애플리케이션의 진입점 및 서버 초기화

**주요 구성 요소:**

#### Express 앱 생성

```javascript
const app = express();
const httpServer = createServer(app);
```

-   Express 앱과 HTTP 서버를 분리하여 Socket.IO와 통합

#### Socket.IO 서버 설정

```javascript
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});
```

-   HTTP 서버에 Socket.IO 서버를 연결
-   CORS 설정으로 클라이언트 접근 제어

#### 인증 미들웨어 (`io.use`)

```javascript
io.use((socket, next) => {
    const clientKey = socket.handshake.auth?.key || socket.handshake.query?.key;
    // 키 검증 로직
    next();
});
```

**동작 흐름:**

1. 클라이언트 연결 시도
2. `handshake.auth.key` 또는 `handshake.query.key`에서 키 추출
3. 서버의 `PROJECT_KEY`와 비교
4. 일치하면 `next()` 호출하여 연결 허용
5. 불일치하면 에러와 함께 연결 거부

**핵심 포인트:**

-   `io.use()`는 모든 연결 시도 전에 실행됨
-   `next()`를 호출해야 실제 연결이 완료됨
-   `next(new Error())`로 연결을 거부할 수 있음

#### REST API 라우트

**`GET /health`**

-   서버 상태 확인 (헬스체크용)
-   **인증**: 불필요
-   응답: `{ status: 'ok', message: 'Server is running' }`

**`GET /status`**

-   서버 상태 및 연결된 클라이언트 수 확인
-   **인증**: 불필요
-   응답: `{ status: 'ok', server: '...', version: '...', connectedClients: number }`
-   `io.sockets.sockets.size`로 실시간 연결 수 조회

---

### 2. `src/socket/handlers.js` - Socket.IO 이벤트 핸들러

**역할**: 모든 Socket.IO 이벤트 처리 로직

#### 연결 이벤트 (`connection`)

```javascript
io.on('connection', (socket) => {
    // 클라이언트 연결 시 실행
});
```

**처리 내용:**

1. 연결 로깅
2. 클라이언트에게 `connected` 이벤트 전송
3. 각종 이벤트 리스너 등록

#### 메시지 이벤트 (`message`)

**클라이언트 → 서버:**

```javascript
socket.emit('message', { type: 'chat', content: 'Hello' });
```

**서버 처리:**

1. 메시지 유효성 검사
2. 메타데이터 추가 (`from`, `timestamp`)
3. 모든 클라이언트에게 브로드캐스트 (`io.emit`)
4. Callback이 있으면 응답 전송

**브로드캐스트 방식:**

-   `io.emit()`: 모든 연결된 클라이언트에게 전송 (자신 포함)
-   `socket.broadcast.emit()`: 자신을 제외한 모든 클라이언트에게 전송

**Callback 패턴:**

```javascript
socket.on('message', (data, callback) => {
    // callback이 함수인지 확인
    if (typeof callback === 'function') {
        callback({ success: true, message: '...' });
    }
});
```

#### 룸 관리 이벤트

**`join-room`**

```javascript
socket.on('join-room', (roomName, callback) => {
    socket.join(roomName); // Socket.IO 내장 메서드
    // 응답 전송
});
```

**동작:**

1. `socket.join(roomName)`으로 룸에 추가
2. `joined-room` 이벤트로 클라이언트에 알림
3. Callback으로 즉시 응답

**`leave-room`**

```javascript
socket.on('leave-room', (roomName, callback) => {
    socket.leave(roomName); // Socket.IO 내장 메서드
    // 응답 전송
});
```

#### 룸 메시지 이벤트 (`room-message`)

**특징:**

-   `room` 필드 필수
-   `io.to(room).emit()`으로 특정 룸에만 전송
-   룸에 참가하지 않은 클라이언트는 메시지를 받지 않음

**동작 흐름:**

```
클라이언트 A → room-message 전송
    ↓
서버: room 필드 검증
    ↓
서버: io.to(room).emit() 실행
    ↓
룸에 참가한 클라이언트들만 메시지 수신
```

#### 연결 해제 이벤트 (`disconnect`)

**처리 내용:**

-   연결 해제 로깅
-   연결 수 업데이트

**연결 해제 이유 (`reason`):**

-   `"io server disconnect"`: 서버에서 강제 종료
-   `"io client disconnect"`: 클라이언트에서 종료
-   `"ping timeout"`: 네트워크 타임아웃
-   `"transport close"`: 전송 계층 종료

---

### 3. `src/middleware/keyValidation.js` - Key 검증 미들웨어

**역할**: Express 라우트에서 사용할 수 있는 인증 미들웨어

**사용 예시:**

```javascript
app.get('/protected', validateKey, (req, res) => {
    res.json({ message: 'Protected resource' });
});
```

**검증 방법:**

1. `req.headers['x-project-key']` 헤더에서만 키 추출 (보안을 위해 헤더만 사용)
2. 서버 키와 비교
3. 일치하면 `next()`, 불일치하면 401 응답

**현재 사용 여부:**

-   ❌ 현재 사용되지 않음 (REST API 엔드포인트는 인증 불필요)
-   ⚠️ 향후 보호가 필요한 REST API 엔드포인트 추가 시 사용 예정
-   ⚠️ 프로덕션 환경을 위한 보안 강화 (JWT, OAuth 등)는 추후 업데이트 예정

---

### 4. `src/utils/logger.js` - 로깅 유틸리티

**역할**: 구조화된 로깅 시스템

#### 로그 레벨

```javascript
const LOG_LEVELS = {
    DEBUG: 0, // 가장 상세한 정보
    INFO: 1, // 일반 정보
    WARN: 2, // 경고
    ERROR: 3, // 에러
};
```

#### 로그 형식

```
[2024-01-01T00:00:00.000Z] [INFO] Message received {"socketId":"abc123"}
```

**구성 요소:**

-   타임스탬프: ISO 8601 형식
-   로그 레벨: DEBUG, INFO, WARN, ERROR
-   메시지: 로그 내용
-   메타데이터: JSON 형식의 추가 정보

#### 환경 변수 제어

```bash
LOG_LEVEL=DEBUG  # 모든 로그 출력
LOG_LEVEL=INFO   # INFO 이상만 출력 (기본값)
LOG_LEVEL=WARN   # WARN 이상만 출력
LOG_LEVEL=ERROR  # ERROR만 출력
```

**프로덕션 권장사항:**

-   현재는 `console.log` 사용
-   프로덕션에서는 Winston, Pino 등 전문 로깅 라이브러리 사용 권장
-   파일 저장, 로그 로테이션, 외부 서비스 연동 등 고려

---

## 이벤트 흐름

### 1. 클라이언트 연결 흐름

```
┌─────────────┐
│  클라이언트   │
└──────┬──────┘
       │ 1. io() 호출 (key 포함)
       │
       ▼
┌─────────────────┐
│  Socket.IO      │
│  Connection     │
│  Middleware     │
└──────┬──────────┘
       │ 2. 키 검증
       │
       ▼
┌─────────────────┐
│  인증 성공?      │
└──────┬──────────┘
       │
   ┌───┴───┐
   │       │
  YES     NO
   │       │
   │       └───► connect_error 이벤트
   │
   ▼
┌─────────────────┐
│  connection     │
│  이벤트 발생      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  connected      │
│  이벤트 전송      │
└─────────────────┘
```

### 2. 메시지 전송 흐름

```
┌─────────────┐
│ 클라이언트 A  │
└──────┬──────┘
       │ 1. emit('message', data, callback?)
       │
       ▼
┌─────────────────┐
│  서버: message   │
│  이벤트 수신      │
└──────┬──────────┘
       │ 2. 유효성 검사
       │
       ▼
┌────────────────────┐
│  메타데이터 추가     │
│  (from, timestamp) │
└──────┬─────────────┘
       │
       ▼
┌─────────────────┐
│  io.emit()      │
│  브로드캐스트     │
└──────┬──────────┘
       │
   ┌───┴───┐
   │       │
   │       │
   ▼       ▼
┌──────┐ ┌──────┐ ┌──────┐
│  A   │ │  B   │ │  C   │
└──────┘ └──────┘ └──────┘
  (모든 클라이언트가 메시지 수신)
       │
       ▼
┌─────────────────┐
│  Callback 응답?  │
└──────┬──────────┘
       │
      YES
       │
       ▼
┌─────────────────┐
│  클라이언트 A     │
│  Callback 호출   │
└─────────────────┘
```

### 3. 룸 메시지 전송 흐름

```
┌─────────────┐
│ 클라이언트 A  │
└──────┬──────┘
       │ 1. emit('room-message', { room: 'room1', ... })
       │
       ▼
┌─────────────────┐
│  서버: room     │
│  필드 검증       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  io.to(room)    │
│  .emit()        │
└──────┬──────────┘
       │
       │ (room1에 참가한 클라이언트만)
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌──────┐
│  A   │ │  B   │  (room1에 참가)
└──────┘ └──────┘
         │
         │ (room1에 참가하지 않음)
         ▼
      ┌──────┐
      │  C   │  (메시지 수신 안 함)
      └──────┘
```

### 4. 룸 참가 흐름

```
┌─────────────┐
│ 클라이언트    │
└──────┬──────┘
       │ 1. emit('join-room', 'room1', callback?)
       │
       ▼
┌─────────────────┐
│  socket.join()  │
│  실행            │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  joined-room    │
│  이벤트 전송      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Callback 응답?  │
└──────┬──────────┘
       │
      YES
       │
       ▼
┌─────────────────┐
│  Callback 호출   │
└─────────────────┘
```

---

## 데이터 흐름

### 메시지 데이터 구조

#### 클라이언트가 전송하는 메시지

```javascript
{
    type: 'chat',           // 메시지 타입 (자유 형식)
    content: 'Hello!',      // 메시지 내용
    user: 'user123',        // 사용자 정보 (선택사항)
    // 추가 필드 자유롭게 추가 가능
}
```

#### 서버가 브로드캐스트하는 메시지

```javascript
{
    type: 'chat',
    content: 'Hello!',
    user: 'user123',
    from: 'socket-id-abc123',           // 서버가 추가
    timestamp: '2024-01-01T00:00:00.000Z'  // 서버가 추가
}
```

### Callback 응답 구조

#### 성공 응답

```javascript
{
    success: true,
    message: 'Message sent successfully',
    timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### 실패 응답

```javascript
{
    success: false,
    message: 'Invalid message format',
    error: 'Error details'  // 선택사항
}
```

### 룸 메시지 데이터 구조

```javascript
// 전송
{
    room: 'room-name',      // 필수
    type: 'chat',
    content: 'Hello!'
}

// 수신
{
    room: 'room-name',
    type: 'chat',
    content: 'Hello!',
    from: 'socket-id-abc123',
    timestamp: '2024-01-01T00:00:00.000Z'
}
```

---

## 보안

### 인증 메커니즘

#### 프로젝트 키 기반 인증

**현재 구현:**

-   하드코딩된 단일 키 사용
-   환경 변수로 관리 (`PROJECT_KEY`)
-   Socket.IO 연결 시 인증 (`io.use` 미들웨어)
-   REST API 엔드포인트 인증 (`validateKey` 미들웨어)

**보안 수준:**

-   ⚠️ 데모/개발/테스트용으로 적합
-   ⚠️ 프로덕션 환경에서는 부족
-   ⚠️ 보안 강화는 추후 업데이트 예정

**개선 방안:**

1. **다중 키 지원**: 프로젝트별 다른 키 사용
2. **JWT 토큰**: 만료 시간이 있는 토큰 기반 인증
3. **OAuth 2.0**: 표준 인증 프로토콜
4. **Rate Limiting**: 요청 제한으로 DDoS 방지

### 데이터 검증

**현재 구현:**

-   메시지가 객체인지 확인
-   룸 이름 존재 여부 확인

**개선 방안:**

-   스키마 검증 (Joi, Zod 등)
-   입력 길이 제한
-   XSS 방지를 위한 데이터 정제

### CORS 설정

**현재 설정:**

```javascript
cors: {
    origin: process.env.CORS_ORIGIN || '*',  // 모든 도메인 허용
    methods: ['GET', 'POST'],
}
```

**프로덕션 권장:**

```javascript
cors: {
    origin: ['https://yourdomain.com'],  // 특정 도메인만 허용
    methods: ['GET', 'POST'],
    credentials: true
}
```

---

## 확장성 및 최적화

### 현재 구조의 한계

1. **단일 서버**: 수평 확장 불가
2. **메모리 기반**: 서버 재시작 시 룸 정보 손실
3. **단일 키**: 프로젝트별 키 관리 불가

### 확장 방안

#### 1. Redis 어댑터 사용

**목적**: 여러 서버 인스턴스 간 상태 공유

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**효과:**

-   여러 서버 인스턴스에서 동일한 룸/메시지 공유
-   로드 밸런서 뒤에서도 정상 작동

#### 2. 데이터베이스 통합

**목적**: 영구 저장 및 복잡한 쿼리

**옵션:**

-   **MongoDB**: 문서 기반, 유연한 스키마
-   **PostgreSQL**: 관계형 데이터, 복잡한 쿼리
-   **Redis**: 빠른 캐시 및 세션 관리

#### 3. 메시지 큐 통합

**목적**: 비동기 처리 및 부하 분산

**옵션:**

-   **RabbitMQ**: 메시지 브로커
-   **Apache Kafka**: 대용량 스트리밍
-   **Bull**: Redis 기반 작업 큐

#### 4. 마이크로서비스 아키텍처

```
┌───────────────┐
│  API Gateway  │
└──────┬────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌──────┐
│ Auth │ │ Msg  │
│ Svc  │ │ Svc  │
└──────┘ └──────┘
```

### 성능 최적화

#### 1. 연결 풀링

-   데이터베이스 연결 재사용
-   HTTP 클라이언트 연결 재사용

#### 2. 캐싱

-   Redis로 자주 조회하는 데이터 캐싱
-   룸 정보, 사용자 정보 등

#### 3. 압축

```javascript
const io = new Server(httpServer, {
    compression: true, // 메시지 압축
});
```

#### 4. 이벤트 배치 처리

여러 메시지를 한 번에 처리하여 네트워크 오버헤드 감소

---

## 학습 가이드

### 초급 단계

#### 1. 기본 개념 이해

-   **Node.js 기초**: 모듈 시스템, 비동기 처리
-   **Express.js**: 미들웨어, 라우팅
-   **Socket.IO**: 이벤트 기반 통신

**학습 자료:**

-   [Node.js 공식 문서](https://nodejs.org/docs)
-   [Express.js 가이드](https://expressjs.com/en/guide/routing.html)
-   [Socket.IO 문서](https://socket.io/docs/v4/)

#### 2. 프로젝트 실행 및 테스트

**단계:**

1. 프로젝트 클론 및 의존성 설치
2. `.env` 파일 생성 및 설정
3. 서버 실행 (`npm run dev`)
4. REST API 테스트 (`test/api.http`)
5. Socket.IO 테스트 (`npm run test:socket`)

#### 3. 코드 읽기 순서

1. `src/server.js` - 서버 초기화
2. `src/socket/handlers.js` - 이벤트 처리
3. `src/utils/logger.js` - 로깅 시스템
4. `src/middleware/keyValidation.js` - 인증 미들웨어

### 중급 단계

#### 1. 이벤트 흐름 이해

-   연결 → 인증 → 이벤트 처리 → 응답 흐름 추적
-   브로드캐스트 vs 룸 메시지 차이 이해

#### 2. Callback 패턴 구현

-   Callback이 어떻게 동작하는지 이해
-   Promise로 래핑하는 방법 학습

#### 3. 에러 처리

-   각 레이어에서의 에러 처리 방법
-   클라이언트에게 에러 전달 방법

### 고급 단계

#### 1. 아키텍처 개선

-   레이어 분리 및 책임 분리
-   의존성 주입 패턴 적용

#### 2. 확장성 구현

-   Redis 어댑터 통합
-   데이터베이스 연동
-   마이크로서비스 분리

#### 3. 테스트 작성

-   단위 테스트 (Jest)
-   통합 테스트
-   E2E 테스트

#### 4. 모니터링 및 로깅

-   Winston/Pino로 로깅 시스템 교체
-   Prometheus 메트릭 수집
-   Grafana 대시보드 구성

### 실습 프로젝트 아이디어

1. **채팅 애플리케이션**: 사용자 인증, 메시지 히스토리
2. **실시간 협업 도구**: 문서 편집, 커서 위치 공유
3. **게임 서버**: 실시간 멀티플레이어 게임
4. **알림 시스템**: 푸시 알림, 실시간 업데이트

---

## 주요 개념 정리

### Socket.IO 핵심 개념

#### 1. Namespace

```javascript
const adminNamespace = io.of('/admin');
```

-   논리적 분리
-   현재는 기본 네임스페이스(`/`)만 사용

#### 2. Room

```javascript
socket.join('room1');
io.to('room1').emit('message', data);
```

-   소켓 그룹화
-   특정 그룹에만 메시지 전송

#### 3. Event

```javascript
socket.emit('event-name', data); // 전송
socket.on('event-name', handler); // 수신
```

-   이벤트 기반 통신
-   임의의 이벤트 이름 사용 가능

#### 4. Callback

```javascript
socket.emit('event', data, (response) => {
    // 응답 처리
});
```

-   즉시 응답 받기
-   요청-응답 패턴 구현

### Express.js 핵심 개념

#### 1. Middleware

```javascript
app.use((req, res, next) => {
    // 미들웨어 로직
    next();
});
```

-   요청/응답 처리 파이프라인
-   순차적으로 실행

#### 2. Route Handler

```javascript
app.get('/path', (req, res) => {
    res.json({ data: 'response' });
});
```

-   HTTP 메서드별 처리
-   경로별 라우팅

---

## 디버깅 가이드

### 로그 레벨 설정

```bash
LOG_LEVEL=DEBUG npm run dev
```

### 주요 디버깅 포인트

1. **연결 실패**: 키 확인, 서버 실행 여부
2. **메시지 수신 안 됨**: 이벤트 이름 확인, 룸 참가 여부
3. **Callback 무한 대기**: 서버에서 callback 호출 확인

### 유용한 디버깅 코드

```javascript
// 연결 상태 확인
console.log('Connected:', socket.connected);
console.log('Socket ID:', socket.id);

// 룸 확인
console.log('Rooms:', Array.from(socket.rooms));

// 서버 연결 수 확인
console.log('Total connections:', io.sockets.sockets.size);
```

---

## 참고 자료

### 공식 문서

-   [Node.js Documentation](https://nodejs.org/docs)
-   [Express.js Guide](https://expressjs.com/en/guide/routing.html)
-   [Socket.IO Documentation](https://socket.io/docs/v4/)

### 학습 자료

-   [Socket.IO 실시간 통신 가이드](https://socket.io/get-started/chat)
-   [Express.js 미들웨어 가이드](https://expressjs.com/en/guide/using-middleware.html)
-   [Node.js 모듈 시스템](https://nodejs.org/api/modules.html)

### 관련 프로젝트

-   [Socket.IO Examples](https://github.com/socketio/socket.io/tree/main/examples)
-   [Express.js Examples](https://github.com/expressjs/express/tree/master/examples)

---

## 버전 정보

-   **문서 버전**: 1.0.0
-   **프로젝트 버전**: 1.0.0
-   **최종 업데이트**: 2024

---

## 기여 가이드

프로젝트 개선을 위한 제안사항:

1. 이슈 등록
2. Pull Request 제출
3. 문서 개선
4. 테스트 추가

---

이 문서는 프로젝트의 기술적 세부사항을 이해하는 데 도움이 되도록 작성되었습니다. 추가 질문이나 개선 사항이 있으면 이슈를 등록해주세요.
