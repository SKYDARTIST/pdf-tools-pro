/**
 * Anti-Gravity Unified Logger
 * Standardized logging for the entire application.
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

// Current Log Level (default to INFO in production, DEBUG in dev)
const CURRENT_LEVEL = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

export const Logger = {
    debug: (context: string, message: string, data?: any) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
            console.debug(`[${context}] 🐛 ${message}`, data || '');
        }
    },

    info: (context: string, message: string, data?: any) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
            console.info(`[${context}] ℹ️ ${message}`, data || '');
        }
    },

    warn: (context: string, message: string, data?: any) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
            console.warn(`[${context}] ⚠️ ${message}`, data || '');
        }
    },

    error: (context: string, message: string, error?: any) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
            console.error(`[${context}] ❌ ${message}`, error || '');
        }
    },
};
