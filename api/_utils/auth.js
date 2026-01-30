import { createHmac, timingSafeEqual } from 'node:crypto';

// Shared signing secret from environment
// SECURITY: Synchronized with AG_PROTOCOL_SIGNATURE (Handshake Protocol)
const sessionSecret = process.env.AG_PROTOCOL_SIGNATURE || process.env.SESSION_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify Session Token (Stateless JWT-lite + DB Persistence)
 * Enforces signature, expiration, and database presence.
 */
export const verifySessionToken = async (token, supabase = null) => {
    if (!token || typeof token !== 'string') return null;
    try {
        const [b64Payload, signature] = token.split('.');
        if (!b64Payload || !signature) return null;

        const payloadStr = Buffer.from(b64Payload, 'base64').toString();
        const expectedSignature = createHmac('sha256', sessionSecret).update(payloadStr).digest('hex');

        const signatureBuf = Buffer.from(signature, 'hex');
        const expectedSignatureBuf = Buffer.from(expectedSignature, 'hex');

        if (signatureBuf.length !== expectedSignatureBuf.length) return null;
        if (!timingSafeEqual(signatureBuf, expectedSignatureBuf)) return null;

        const payload = JSON.parse(payloadStr);
        if (Date.now() > payload.exp) return null; // Expiration check

        // SECURITY: Database-backed persistence check (Fix for 401 loops)
        if (supabase) {
            console.log(`[AUTH] Verifying session in DB: ${token.substring(0, 20)}...`);
            const { data, error } = await supabase
                .from('sessions')
                .select('user_uid')
                .eq('session_token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                console.warn('[AUTH] Session not found in DB or expired.');
                return null;
            }
        }

        return payload;
    } catch (e) {
        console.error('[AUTH] Validation error:', e.message);
        return null;
    }
};

/**
 * Common security headers for all API responses
 */
export const setSecurityHeaders = (res, origin, allowedOrigins) => {
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ag-device-id, x-ag-signature, x-ag-integrity-token, x-csrf-token');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
};
