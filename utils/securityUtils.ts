/**
 * Anti-Gravity Security Utility
 * Masking sensitive data for production logs.
 */

export const maskString = (str: string | null | undefined, visibleChars: number = 8): string => {
    if (!str) return 'null';
    if (str.length <= visibleChars) return '***';
    return `${str.substring(0, visibleChars)}...[REDACTED]`;
};

export const maskEmail = (email: string | null | undefined): string => {
    if (!email) return 'null';
    const [user, domain] = email.split('@');
    if (!domain) return '***@***';
    return `${user.substring(0, 2)}***@${domain}`;
};

/**
 * Production-safe logger that redacts sensitive information.
 */
export const SecurityLogger = {
    log: (message: string, data?: any) => {
        if (import.meta.env.PROD) {
            // In production, we don't log the full data object if it contains keys we know are sensitive
            const sanitizedData = data ? { ...data } : undefined;
            if (sanitizedData) {
                if (sanitizedData.deviceId) sanitizedData.deviceId = maskString(sanitizedData.deviceId);
                if (sanitizedData.google_uid) sanitizedData.google_uid = maskString(sanitizedData.google_uid);
                if (sanitizedData.email) sanitizedData.email = maskEmail(sanitizedData.email);
            }
            console.log(`[Neural-Link] ${message}`, sanitizedData);
        } else {
            console.log(message, data);
        }
    },
    error: (message: string, error?: any) => {
        console.error(`[Neural-Fault] ${message}`, error);
    }
};
