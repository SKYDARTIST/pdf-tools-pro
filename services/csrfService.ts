/**
 * CSRF Protection Service
 * Prevents Cross-Site Request Forgery attacks on subscription API endpoints
 */

const CSRF_TOKEN_KEY = 'ag_csrf_token';
const CSRF_TOKEN_TIMESTAMP_KEY = 'ag_csrf_token_timestamp';
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour expiry

/**
 * Store CSRF token received from server during session initialization
 */
export const setCsrfToken = (token: string): void => {
    try {
        localStorage.setItem(CSRF_TOKEN_KEY, token);
        localStorage.setItem(CSRF_TOKEN_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
        console.error('Failed to store CSRF token:', error);
    }
};

/**
 * Get stored CSRF token (validates expiry)
 */
export const getCsrfToken = (): string | null => {
    try {
        const token = localStorage.getItem(CSRF_TOKEN_KEY);
        const timestamp = localStorage.getItem(CSRF_TOKEN_TIMESTAMP_KEY);

        if (!token || !timestamp) {
            return null;
        }

        // Check if token has expired
        const issuedAt = parseInt(timestamp, 10);
        if (Date.now() - issuedAt > CSRF_TOKEN_TTL) {
            // Token expired, clear it
            localStorage.removeItem(CSRF_TOKEN_KEY);
            localStorage.removeItem(CSRF_TOKEN_TIMESTAMP_KEY);
            return null;
        }

        return token;
    } catch (error) {
        console.error('Failed to retrieve CSRF token:', error);
        return null;
    }
};

/**
 * Clear CSRF token (called on logout)
 */
export const clearCsrfToken = (): void => {
    try {
        localStorage.removeItem(CSRF_TOKEN_KEY);
        localStorage.removeItem(CSRF_TOKEN_TIMESTAMP_KEY);
    } catch (error) {
        console.error('Failed to clear CSRF token:', error);
    }
};
