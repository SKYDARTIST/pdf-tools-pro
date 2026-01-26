/**
 * Persistent Log Service - Stores logs to localStorage for debugging
 * Survives page reloads and allows viewing logs in debug panel
 */

const LOG_STORAGE_KEY = 'ag_persistent_logs';
const MAX_LOGS = 200; // Keep last 200 log entries

export interface LogEntry {
    timestamp: string;
    level: 'log' | 'error' | 'warn' | 'info';
    message: string;
    data?: any;
}

export const addLog = (level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any): void => {
    try {
        const logs: LogEntry[] = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');

        logs.push({
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        });

        // Keep only last MAX_LOGS entries
        if (logs.length > MAX_LOGS) {
            logs.splice(0, logs.length - MAX_LOGS);
        }

        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
        console.error('Failed to persist log:', error);
    }
};

export const getLogs = (): LogEntry[] => {
    try {
        return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

export const clearLogs = (): void => {
    try {
        localStorage.removeItem(LOG_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear logs:', error);
    }
};

export const getLogsAsText = (): string => {
    const logs = getLogs();
    return logs.map(log => {
        const dataStr = log.data ? `\n  ${JSON.stringify(log.data, null, 2)}` : '';
        return `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
    }).join('\n');
};

// Monkey-patch console methods to also log to localStorage
export const initializePersistentLogging = (): void => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = function (...args: any[]) {
        originalLog.apply(console, args);
        // Only capture Anti-Gravity logs
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        if (message.includes('Anti-Gravity') || message.includes('🚀')) {
            addLog('log', message, args.length > 1 ? args[1] : undefined);
        }
    };

    console.error = function (...args: any[]) {
        originalError.apply(console, args);
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        if (message.includes('Anti-Gravity') || message.includes('🚀')) {
            addLog('error', message, args.length > 1 ? args[1] : undefined);
        }
    };

    console.warn = function (...args: any[]) {
        originalWarn.apply(console, args);
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        if (message.includes('Anti-Gravity') || message.includes('🚀')) {
            addLog('warn', message, args.length > 1 ? args[1] : undefined);
        }
    };

    console.info = function (...args: any[]) {
        originalInfo.apply(console, args);
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        if (message.includes('Anti-Gravity') || message.includes('🚀')) {
            addLog('info', message, args.length > 1 ? args[1] : undefined);
        }
    };
};
