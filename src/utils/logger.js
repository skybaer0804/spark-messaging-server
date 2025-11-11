/**
 * 간단한 로깅 유틸리티
 * 프로덕션 환경에서는 winston 등의 라이브러리 사용 권장
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

const currentLogLevel = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO : LOG_LEVELS.INFO;

const formatMessage = (level, message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

export const logger = {
    debug: (message, metadata) => {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
            console.log(formatMessage('DEBUG', message, metadata));
        }
    },

    info: (message, metadata) => {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            console.log(formatMessage('INFO', message, metadata));
        }
    },

    warn: (message, metadata) => {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
            console.warn(formatMessage('WARN', message, metadata));
        }
    },

    error: (message, metadata) => {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
            console.error(formatMessage('ERROR', message, metadata));
        }
    },
};
