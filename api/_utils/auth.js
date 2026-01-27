import { createHmac } from 'node:crypto';

// Shared signing secret from environment
const sessionSecret = process.env.SESSION_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify Session Token (Stateless JWT-lite)
 * Enforces signature and expiration.
 */
export const verifySessionToken = (token) => {
    if (!token || typeof token !== 'string') return null;
    try {
        const [b64Payload, signature] = token.split('.');
        if (!b64Payload || !signature) return null;

        const payloadStr = Buffer.from(b64Payload, 'base64').toString();
        const expectedSignature = createHmac('sha256', sessionSecret).update(payloadStr).digest('hex');

        // Timing-safe comparison
        if (signature.length !== expectedSignature.length) return null;
        let match = true;
        for (let i = 0; i < signature.length; i++) {
            if (signature[i] !== expectedSignature[i]) match = false;
        }
        if (!match) return null;

        const payload = JSON.parse(payloadStr);
        if (Date.now() > payload.exp) return null; // Expiration check

        return payload;
    } catch (e) { return null; }
};

/**
 * Common security headers for all API responses
 */
export const setSecurityHeaders = (res, origin, allowedOrigins) => {
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ag-device-id, x-ag-signature, x-ag-integrity-token');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
};
