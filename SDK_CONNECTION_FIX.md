# SDK Connection 수정 가이드

## 문제점

Node.js 환경에서는 Socket.IO 클라이언트의 `extraHeaders`가 제대로 작동하지 않을 수 있습니다. 특히 브라우저가 아닌 환경에서는 HTTP 헤더를 직접 설정하는 것이 제한적입니다.

## 해결 방법

백엔드 서버는 `socket.handshake.auth?.key`와 `socket.handshake.query?.key`를 모두 지원하므로, SDK에서 `auth` 객체를 사용하는 것이 가장 안정적입니다.

## 수정된 코드

```typescript
import { io, Socket } from 'socket.io-client';
import { SparkMessagingOptions } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Socket 연결 관리 클래스
 */
export class Connection {
    private socket: Socket | null = null;
    private options: SparkMessagingOptions;
    private errorHandler: ErrorHandler;
    private isConnecting: boolean = false;

    constructor(options: SparkMessagingOptions, errorHandler: ErrorHandler) {
        this.options = options;
        this.errorHandler = errorHandler;
    }

    /**
     * Socket 연결 초기화
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }

            if (this.isConnecting) {
                reject(new Error('Connection already in progress'));
                return;
            }

            this.isConnecting = true;

            try {
                // Socket.IO 연결 옵션 설정
                // Node.js 환경 호환성을 위해 auth 객체 사용 (권장)
                const socketOptions: any = {
                    auth: {
                        key: this.options.projectKey,
                    },
                    reconnection: this.options.reconnection ?? true,
                    reconnectionAttempts: this.options.reconnectionAttempts ?? 5,
                    reconnectionDelay: this.options.reconnectionDelay ?? 1000,
                };

                this.socket = io(this.options.serverUrl, socketOptions);

                // 연결 성공 핸들러
                this.socket.on('connect', () => {
                    this.isConnecting = false;
                    resolve();
                });

                // 연결 실패 핸들러
                this.socket.on('connect_error', (error: Error) => {
                    this.isConnecting = false;
                    this.errorHandler.handleError({
                        message: error.message || 'Connection failed',
                        code: 'CONNECTION_ERROR',
                    });
                    reject(error);
                });

                // 에러 핸들러
                this.socket.on('error', (error: any) => {
                    this.errorHandler.handleError({
                        message: error.message || 'Socket error occurred',
                        code: error.code || 'SOCKET_ERROR',
                    });
                });

                // 연결 끊김 핸들러
                this.socket.on('disconnect', (reason: string) => {
                    if (reason === 'io server disconnect') {
                        // 서버가 연결을 끊은 경우 (예: 인증 실패)
                        this.errorHandler.handleError({
                            message: 'Server disconnected',
                            code: 'SERVER_DISCONNECT',
                        });
                    }
                });
            } catch (error) {
                this.isConnecting = false;
                const err = error instanceof Error ? error : new Error('Unknown connection error');
                this.errorHandler.handleError(err);
                reject(err);
            }
        });
    }

    /**
     * Socket 연결 종료
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnecting = false;
    }

    /**
     * Socket 인스턴스 가져오기
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * 연결 상태 확인
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    /**
     * Socket ID 가져오기
     */
    getSocketId(): string | undefined {
        return this.socket?.id;
    }
}
```

## 주요 변경 사항

### 1. `auth` 객체 사용 (권장)

```typescript
auth: {
    key: this.options.projectKey,
}
```

-   Node.js와 브라우저 환경 모두에서 안정적으로 작동
-   백엔드 서버의 `socket.handshake.auth?.key`로 전달됨
-   **가장 권장되는 방법**

### 2. `extraHeaders`는 Socket.IO 연결에서 지원되지 않음

**중요**: `extraHeaders`는 Socket.IO 연결에서 서버가 처리하지 않습니다.

-   `extraHeaders`는 Express REST API (`/api/*` 엔드포인트)에서만 사용됩니다
-   Socket.IO 연결에서는 `auth` 객체 또는 `query` 파라미터만 사용 가능합니다
-   따라서 SDK 코드에서 `extraHeaders`를 제거하는 것이 좋습니다

## 대안: Query 파라미터 사용

만약 `auth` 객체도 문제가 있다면, Query 파라미터를 사용할 수도 있습니다:

```typescript
const socketOptions: any = {
    query: {
        key: this.options.projectKey,
    },
    reconnection: this.options.reconnection ?? true,
    reconnectionAttempts: this.options.reconnectionAttempts ?? 5,
    reconnectionDelay: this.options.reconnectionDelay ?? 1000,
};

this.socket = io(this.options.serverUrl, socketOptions);
```

하지만 `auth` 객체를 사용하는 것이 더 권장됩니다.

**참고**: `query` 파라미터는 URL에 노출되므로 보안상 `auth` 객체 사용을 권장합니다.

## 백엔드 지원 확인 및 인증 방법 요약

백엔드 서버(`server.js`)는 다음 순서로 키를 확인합니다:

```46:50:src/server.js
io.use((socket, next) => {
    // auth 객체 우선 사용 (권장), 없으면 query 파라미터 사용
    const authKey = socket.handshake.auth?.key;
    const queryKey = socket.handshake.query?.key;
    const clientKey = authKey || queryKey;
```

**지원되는 방법**:

1. ✅ `auth.key` - 권장 방법 (Node.js/브라우저 모두 지원)
2. ✅ `query.key` - 대안 방법 (URL에 노출되므로 보안상 덜 권장)
3. ❌ `extraHeaders` - Socket.IO 연결에서 지원되지 않음 (Express REST API에서만 사용)

## 테스트

수정 후 다음을 테스트하세요:

1. **Node.js 환경**: `auth` 객체로 키가 전달되는지 확인
2. **브라우저 환경**: `auth` 객체로 키가 전달되는지 확인
3. **Query 파라미터**: 필요시 `query.key`로도 작동하는지 확인
4. **연결 실패 시**: 적절한 에러 메시지가 표시되는지 확인
