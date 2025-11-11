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
                    // 브라우저 환경을 위한 extraHeaders도 함께 제공 (선택사항)
                    // Node.js에서는 auth 객체가 우선적으로 사용됨
                    extraHeaders:
                        typeof window === 'undefined'
                            ? undefined
                            : {
                                  'x-project-key': this.options.projectKey,
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

### 2. `extraHeaders` 조건부 사용

```typescript
extraHeaders: typeof window === 'undefined'
    ? undefined
    : {
          'x-project-key': this.options.projectKey,
      };
```

-   브라우저 환경에서만 `extraHeaders` 사용
-   Node.js 환경에서는 `undefined`로 설정하여 불필요한 헤더 제거

## 대안: Query 파라미터 사용

만약 `auth` 객체도 문제가 있다면, Query 파라미터를 사용할 수도 있습니다:

```typescript
const socketOptions: any = {
    query: {
        key: this.options.projectKey,
    },
    // ... 나머지 옵션
};

this.socket = io(this.options.serverUrl, socketOptions);
```

하지만 `auth` 객체를 사용하는 것이 더 권장됩니다.

## 백엔드 지원 확인

백엔드 서버는 다음 순서로 키를 확인합니다:

```javascript
const clientKey = socket.handshake.auth?.key || socket.handshake.query?.key;
```

따라서:

1. `auth.key`가 있으면 우선 사용
2. 없으면 `query.key` 사용
3. 둘 다 없으면 연결 거부

## 테스트

수정 후 다음을 테스트하세요:

1. **Node.js 환경**: `auth` 객체로 키가 전달되는지 확인
2. **브라우저 환경**: `auth` 객체와 `extraHeaders` 모두 작동하는지 확인
3. **연결 실패 시**: 적절한 에러 메시지가 표시되는지 확인
