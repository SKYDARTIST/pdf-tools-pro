import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import crypto from 'crypto';

// Anti-Gravity Backend v2.9.0 - Cyber Security Hardened
const SYSTEM_INSTRUCTION = `You are the Anti-Gravity AI. Your goal is to help users understand complex documents. Use the provided CONTEXT or DOCUMENT TEXT as your primary source. Maintain a professional, technical tone.`;

// ENVIRONMENT DETECTION
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

// Supabase credentials - MUST be set in Vercel environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const apiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not configured. Usage tracking will be disabled.');
}

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Memory-safe model cache
let cachedModels = null;
let lastDiscovery = 0;

import { kv } from '@vercel/kv';

// RATE LIMITING (Distributed Vercel KV)
// SECURITY: Stricter limits for production readiness
const RATE_LIMIT_WINDOW = 60; // 1 Minute
const MAX_REQUESTS = 5; // Reduced from 10 to 5 reqs / min
const PURCHASE_MAX_REQUESTS = 2; // Strict limit for payment attempts

// GOOGLE PLAY CONFIGURATION
const PACKAGE_NAME = 'com.cryptobulla.antigravity';
const VALID_PRODUCTS = new Set([
    'lifetime_pro_access',
    'pro_access_lifetime', // legacy
    'monthly_pro_pass'
]);
let playDeveloperApi = null;

/**
 * Initialize Google Play API client
 */
const getPlayApi = async () => {
    if (playDeveloperApi) return playDeveloperApi;

    try {
        const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
            ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
            : null;

        if (!credentials) {
            console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_JSON not configured.');
            return null;
        }

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        playDeveloperApi = google.androidpublisher({ version: 'v3', auth });
        return playDeveloperApi;
    } catch (e) {
        console.error('Failed to initialize Google Play API:', e);
        return null;
    }
};

/**
 * authoritatively verifies a purchase with Google Play
 */
async function validateWithGooglePlay(productId, purchaseToken) {
    const api = await getPlayApi();

    // SECURITY: Fail-CLOSED in production
    if (!api) {
        console.error('🛡️ Anti-Gravity Security: Google Play API not available. Critical Failure.');
        return false;
    }

    try {
        // Distinguish between Subscriptions and One-time Products
        const isSubscription = productId.includes('monthly') || productId.includes('yearly') || productId.includes('pass');
        const now = Date.now();

        if (isSubscription) {
            const res = await api.purchases.subscriptions.get({
                packageName: PACKAGE_NAME,
                subscriptionId: productId,
                token: purchaseToken,
            });

            // SECURITY (V4): Verify Acknowledgment + Payment + Expiry
            const isAcknowledged = res.data.acknowledgementState === 1;
            const isPaid = res.data.paymentState === 1 || res.data.paymentState === 2; // 1=Received, 2=Free Trial
            const expiryTime = res.data.expiryTimeMillis ? parseInt(res.data.expiryTimeMillis) : 0;
            const isActive = expiryTime > now;

            if (!isAcknowledged && IS_PRODUCTION) {
                console.warn(`Anti-Gravity Security: Unacknowledged purchase detected for ${productId}`);
                return false;
            }

            return isPaid && isActive;
        } else {
            const res = await api.purchases.products.get({
                packageName: PACKAGE_NAME,
                productId: productId,
                token: purchaseToken,
            });

            // SECURITY (V4): Verify Acknowledgment for One-time products
            const isAcknowledged = res.data.acknowledgementState === 1;
            const isPurchased = res.data.purchaseState === 0;

            if (!isAcknowledged && IS_PRODUCTION) {
                console.warn(`Anti-Gravity Security: Unacknowledged product detected for ${productId}`);
                return false;
            }

            return isPurchased;
        }
    } catch (err) {
        console.error(`Google Play Verification Failed for ${productId}:`, err.message);
        return false;
    }
}

export default async function handler(req, res) {
    try {
        // STAGE 0: CORS & Security Headers
        const origin = req.headers.origin;
        const ALLOWED_ORIGINS = [
            'capacitor://localhost',
            'http://localhost',
            'http://localhost:3000',
            'http://localhost:5173',
            'https://pdf-tools-pro.vercel.app',
            'https://pdf-tools-pro-indol.vercel.app'
        ];

        const isLocalhost = origin && origin.startsWith('http://localhost');
        const allowedOrigin = (origin && ALLOWED_ORIGINS.includes(origin)) || isLocalhost;

        if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (IS_PRODUCTION) {
            // SECURITY (V6.0): STRICT CORS LOCKDOWN
            // Deny all requests from unauthorized origins in production.
            console.error(`🛡️ Anti-Gravity Security: Blocked CORS request from unauthorized origin: ${origin}`);
            return res.status(403).json({ error: 'UNAUTHORIZED_ORIGIN' });
        } else {
            // Development fallback
            res.setHeader('Access-Control-Allow-Origin', '*');
        }

        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ag-signature, x-ag-timestamp, x-ag-device-id, x-ag-integrity-token, x-csrf-token, x-request-id');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // GOOGLE PLAY WEBHOOK (RTDN - Real Time Developer Notifications)
        // This endpoint must be public (no session auth) but verified with Google's Signature
        if (req.body?.message?.data) {
            console.log('🛡️ RTDN: Google Play Webhook received. Validating Signature...');

            const signature = req.headers['x-goog-signature'];
            const publicKey = process.env.GOOGLE_PLAY_WEBHOOK_PUBLIC_KEY;

            if (IS_PRODUCTION && (!signature || !publicKey)) {
                console.error('🛡️ Anti-Gravity Security: Webhook signature or Public Key missing.');
                return res.status(401).json({ error: 'WEBHOOK_AUTH_MISSING' });
            }

            try {
                if (IS_PRODUCTION) {
                    const verifier = crypto.createVerify('RSA-SHA256');
                    verifier.update(JSON.stringify(req.body));
                    const isValid = verifier.verify(publicKey, signature, 'base64');

                    if (!isValid) {
                        console.warn('🛡️ Anti-Gravity Security: Webhook signature verification failed.');
                        return res.status(401).json({ error: 'INVALID_WEBHOOK_SIGNATURE' });
                    }
                }

                // Process RTDN (Renewals, Cancellations, etc.)
                console.log('🛡️ RTDN: Signature valid. Processing developer notification...');
                return res.status(200).json({ success: true, message: 'WEB_HOOK_ACKNOWLEDGED' });
            } catch (e) {
                console.error('🛡️ RTDN: Verification error:', e.message);
                return res.status(500).json({ error: 'WEBHOOK_VERIFICATION_FAILED' });
            }
        }

        // Ensure POST method
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const signature = req.headers['x-ag-signature'];
        let deviceId = req.headers['x-ag-device-id'];
        const integrityToken = req.headers['x-ag-integrity-token'];

        // Helper: Mask device ID for safe logging
        const maskDeviceId = (id) => {
            if (!id) return 'unknown';
            return id.substring(0, 8) + '...' + id.substring(id.length - 4);
        };

        const { type: requestType = '', usage = null, deviceId: bodyDeviceId } = req.body || {};
        if (!deviceId && bodyDeviceId) deviceId = bodyDeviceId;

        // SECURITY: CRITICAL VULNERABILITY FIX (P0)
        // REMOVED: isGuidance bypass. All requests must now pass session validation.
        // If a request needs to be unauthenticated, it must use a minimal authorized session (anonymous).

        console.log('Anti-Gravity API: Incoming request:', {
            type: requestType,
            deviceId: maskDeviceId(deviceId),
            hasSignature: !!signature,
            hasIntegrityToken: !!integrityToken,
            timestamp: new Date().toISOString()
        });

        // STAGE -1: Rate Limiting (early, before session validation)
        // Rate limit all requests to prevent abuse
        const rateLimitKey = deviceId || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const rateNow = Date.now();

        if (rateLimitKey) {
            const key = `rate:${rateLimitKey}`;
            try {
                // Atomic increment
                const count = await kv.incr(key);

                // Set expiry on first request
                if (count === 1) {
                    await kv.expire(key, RATE_LIMIT_WINDOW);
                }

                if (count > MAX_REQUESTS) {
                    const ttl = await kv.ttl(key);
                    console.warn(`Anti-Gravity Security: Global Rate limit exceeded for ${maskDeviceId(rateLimitKey)}`);
                    res.setHeader('Retry-After', ttl);
                    return res.status(429).json({ error: `Rate limit exceeded. Please wait ${ttl} seconds.` });
                }
            } catch (kvError) {
                // Fail-Open: Allow request if KV is down or unconfigured
                console.error('Anti-Gravity Security: Rate Limit KV Error (Fail-Open):', kvError.message);
            }
        }

        // STAGE 0: Session Authentication & Integrity
        // --------------------------------------------------------------------------------
        const { createHmac, randomBytes, timingSafeEqual } = await import('node:crypto');

        const sessionSecret = process.env.AG_PROTOCOL_SIGNATURE;
        if (!sessionSecret) {
            console.error("🛡️ Anti-Gravity Security: AG_PROTOCOL_SIGNATURE is missing. Rejecting auth.");
            return res.status(500).json({ error: 'SERVER_CONFIG_ERROR', details: 'AG_PROTOCOL_SIGNATURE not set' });
        }

        // Helper: Generate Session Token (Stateless JWT-lite + DB Persistence)
        const generateSessionToken = async (uid, isAuth = false) => {
            const now = Date.now();
            const exp = now + (60 * 60 * 1000); // 1 hour
            const payload = JSON.stringify({
                uid: uid,
                is_auth: isAuth,
                iat: now,
                exp: exp,
                jti: Buffer.from(`${uid}-${now}-${randomBytes(8).toString('hex')}`).toString('base64')
            });
            const signature = createHmac('sha256', sessionSecret).update(payload).digest('hex');
            const token = Buffer.from(payload).toString('base64') + '.' + signature;

            // SECURITY: Persist to DB for authoritative validation (Fix for 401 loops)
            if (supabase) {
                console.log(`[AUTH] Registering fresh session for ${isAuth ? 'Google' : 'Device'} user: ${maskDeviceId(uid)}`);
                const { error: sessErr } = await supabase.from('sessions').insert([{
                    session_token: token,
                    user_uid: uid,
                    device_id: deviceId || 'unknown',
                    expires_at: new Date(exp).toISOString()
                }]);

                if (sessErr) {
                    console.error('[AUTH] Failed to persist session to DB:', sessErr.message);
                }
            }

            return token;
        };

        // Helper: Verify Session Token
        const verifySessionToken = async (token) => {
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
                if (Date.now() > payload.exp) return null;

                // CRITICAL: Double-check DB persistence to prevent 401 retry loops
                if (supabase) {
                    const { data, error } = await supabase
                        .from('sessions')
                        .select('user_uid')
                        .eq('session_token', token)
                        .gt('expires_at', new Date().toISOString())
                        .maybeSingle();

                    if (error || !data) {
                        console.warn('[AUTH] Token signature valid but NOT FOUND in sessions table.');
                        return null;
                    }
                }

                return payload;
            } catch (e) { return null; }
        };

        // Helper: Verify CSRF Token (Verified with Session Secret)
        const verifyCsrfToken = (token) => {
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
                if (Date.now() > payload.exp) return null;

                return payload;
            } catch (e) { return null; }
        };

        // Helper: Verify Identity (SERVER-SIDE)
        const verifyIdentity = async (credential) => {
            if (!credential) return null;
            try {
                if (supabase) {
                    const { data: { user }, error } = await supabase.auth.getUser(credential);
                    if (!error && user) return user.id;
                }
                const googleVerify = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
                if (googleVerify.ok) {
                    const data = await googleVerify.json();
                    return data.sub;
                }
            } catch (e) { console.error('Identity Verification Failed:', e); }
            return null;
        };

        // Handshake Endpoint: Exchange Credential for Session Token
        if (requestType === 'session_init') {
            const expectedSignature = process.env.AG_PROTOCOL_SIGNATURE;
            const { credential } = req.body;

            if (!signature || signature !== expectedSignature) {
                return res.status(401).json({ error: 'UNAUTHORIZED_PROTOCOL' });
            }

            let verifiedUid = null;
            let profile = null;

            if (credential) {
                // SECURITY: Verify Identity (SERVER-SIDE)
                try {
                    // Normal verification flow
                    const parts = credential.split('.');
                    if (parts.length === 3) {
                        const b64Payload = parts[1];
                        const payloadStr = Buffer.from(b64Payload, 'base64').toString();
                        const payload = JSON.parse(payloadStr);
                        profile = {
                            google_uid: payload.sub,
                            email: payload.email,
                            name: payload.name,
                            picture: payload.picture
                        };
                    }

                    verifiedUid = await verifyIdentity(credential);
                    if (!verifiedUid) return res.status(401).json({ error: 'INVALID_CREDENTIAL' });

                    // SYNC USER TO DB (SERVICE ROLE BYPASSES RLS)
                    if (supabase && profile) {
                        console.log('🛡️ Syncing user profile for:', maskDeviceId(profile.google_uid));
                        await supabase.from('user_accounts').upsert([{
                            ...profile,
                            last_login: new Date().toISOString(),
                        }], { onConflict: 'google_uid' });
                    }
                } catch (e) {
                    console.error('Handshake Error:', e);
                    return res.status(401).json({ error: 'IDENTITY_VERIFICATION_FAILED' });
                }
            }

            const targetUid = verifiedUid || deviceId;
            const sessionToken = await generateSessionToken(targetUid, !!verifiedUid);
            const csrfToken = await generateSessionToken(targetUid, !!verifiedUid);

            return res.status(200).json({
                sessionToken,
                csrfToken,
                is_auth: !!verifiedUid,
                profile: profile // Return profile to client to avoid RLS SELECT requirement
            });
        }

        // SECURITY: Unified Auth Enforcement for ALL other routes
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const session = await verifySessionToken(token);

        // PUBLIC ACTIONS: Endpoints that don't require is_auth validation
        // These handle their own authorization logic or are safe for anonymous users
        const PUBLIC_ACTIONS = [
            'verify_purchase',           // Purchase verification (has own validation)
            'check_subscription_status', // Status check (read-only)
            'usage_fetch',               // Usage data fetch
            'usage_sync',                // Usage data sync
            'server_time'                // Server time (utility endpoint)
        ];

        // MANDATORY LOGIN ENFORCEMENT (v2.9.2)
        // All requests except public actions must be backed by a verified Google Identity
        if (!PUBLIC_ACTIONS.includes(requestType)) {
            if (!session || !session.is_auth) {
                console.warn(`Anti-Gravity Security: Blocked unauthenticated/anonymous request from ${maskDeviceId(deviceId)} for ${requestType}`);
                return res.status(401).json({ error: 'SESSION_EXPIRED', details: 'Your session has expired or is invalid. Please log in again.' });
            }
        }

        // STAGE 2: Backend Logic & Business Rules
        // --------------------------------------------------------------------------------
        async function handleBackendLogic() {
            if (requestType === 'server_time') {
                return res.status(200).json({ iso: new Date().toISOString() });
            }

            // SECURITY: Critical Vulnerability Fix (P0) - Purchase Verification
            // Dedicated endpoint for handling purchases. Trusts NO client-side state.
            // SECURITY (V3): Subscription Lifecycle Check
            if (requestType === 'check_subscription_status') {
                try {
                    const { data: user } = await supabase
                        .from('user_accounts')
                        .select('active_purchase_token, tier, last_subscription_check')
                        .eq('google_uid', session.uid)
                        .single();

                    if (!user || user.tier === 'free') {
                        return res.status(200).json({ tier: 'free', active: false });
                    }

                    // Re-verify if check is stale (> 24h)
                    const lastCheck = user.last_subscription_check ? new Date(user.last_subscription_check) : new Date(0);
                    if ((Date.now() - lastCheck.getTime()) > 86400000) {
                        const productId = user.tier === 'lifetime' ? 'lifetime_pro_access' : 'monthly_pro_pass';
                        const isStillActive = await validateWithGooglePlay(productId, user.active_purchase_token);

                        if (!isStillActive) {
                            await supabase.from('user_accounts').update({ tier: 'free', last_subscription_check: new Date().toISOString() }).eq('google_uid', session.uid);
                            return res.status(200).json({ tier: 'free', active: false, expired: true });
                        }

                        await supabase.from('user_accounts').update({ last_subscription_check: new Date().toISOString() }).eq('google_uid', session.uid);
                    }

                    return res.status(200).json({ tier: user.tier, active: true });
                } catch (e) {
                    return res.status(500).json({ error: 'SUBSCRIPTION_CHECK_FAILED' });
                }
            }

            if (requestType === 'verify_purchase') {
                const { purchaseToken, productId, transactionId, timestamp } = req.body;

                // 0. WHITELIST CHECK (V6.0)
                if (!VALID_PRODUCTS.has(productId)) {
                    console.error(`🛡️ Anti-Gravity Security: Invalid ProductID ${productId} from ${maskDeviceId(deviceId)}`);
                    return res.status(400).json({ error: 'INVALID_PRODUCT_ID' });
                }

                // 1. TIERED RATE LIMITING (V6.0) - Burst (5/5min) and Sustain (10/hr)
                if (kv && deviceId) {
                    const burstKey = `rl:purchase:burst:${deviceId}`;
                    const sustainKey = `rl:purchase:sustain:${deviceId}`;

                    const [burstCount, sustainCount] = await Promise.all([
                        kv.incr(burstKey),
                        kv.incr(sustainKey)
                    ]);

                    if (burstCount === 1) await kv.expire(burstKey, 300); // 5 mins
                    if (sustainCount === 1) await kv.expire(sustainKey, 3600); // 1 hour

                    if (burstCount > 5 || sustainCount > 10) {
                        console.warn(`🛡️ Anti-Gravity Security: Purchase Throttled for ${maskDeviceId(deviceId)} (Burst: ${burstCount}, Sustain: ${sustainCount})`);
                        return res.status(429).json({ error: 'TOO_MANY_PURCHASE_ATTEMPTS', retryAfter: '60s' });
                    }
                }

                // 2. STRICT CSRF: No device ID fallback for purchase endpoints (V5.0/V6.0)
                const csrfHeader = req.headers['x-csrf-token'];
                const csrfPayload = verifyCsrfToken(csrfHeader);
                const googleUid = session?.uid;
                const isValidCsrf = csrfPayload && csrfPayload.uid === googleUid;

                if (!isValidCsrf) {
                    console.warn(`🛡️ Anti-Gravity Security: Purchase CSRF failure for ${maskDeviceId(deviceId)}`, {
                        hasCsrfHeader: !!csrfHeader,
                        hasCsrfPayload: !!csrfPayload,
                        csrfUid: csrfPayload?.uid,
                        sessionUid: googleUid,
                        transactionId,
                        timestamp: new Date().toISOString()
                    });
                    return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED', details: 'CSRF token missing or invalid' });
                }

                // 2. TIMESTAMP VERIFICATION (V6.0 - Body-HMAC removed for security)
                // NOTE: Signature validation removed in V2.9.3 because client no longer signs requests
                // This prevents secret exposure in client bundle. Session token is now sole authority.
                const clientTimestamp = parseInt(req.headers['x-ag-timestamp']);
                const now = Date.now();

                if (!clientTimestamp || Math.abs(now - clientTimestamp) > 300000) {
                    console.warn(`🛡️ Anti-Gravity Security: Expired request from ${maskDeviceId(deviceId)}`);
                    return res.status(401).json({ error: 'REQUEST_EXPIRED' });
                }

                // Request signature validated via session token (above). Timestamp prevents replay attacks.
                console.log(`🛡️ Anti-Gravity Security: Purchase request validated (session + timestamp)`)

                if (!purchaseToken || !productId || (!transactionId && productId !== 'reset_to_free')) {
                    return res.status(400).json({ error: "INVALID_REQUEST", details: "Missing purchase evidence." });
                }

                // 2. NUCLEAR RESET BYPASS (Admin Only - Issue #1 Fix)
                if (productId === 'reset_to_free') {
                    const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').filter(Boolean);
                    const isAdmin = ADMIN_UIDS.includes(session?.uid);

                    if (!isAdmin) {
                        console.warn(`Anti-Gravity Security: Unauthorized reset attempt by ${maskDeviceId(session?.uid)}`);
                        return res.status(403).json({ error: 'UNAUTHORIZED', details: 'Admin privileges required.' });
                    }

                    const targetUid = session?.uid || req.body.googleUid;
                    console.log(`☢️ NUCLEAR RESET INITIATED for Device: ${maskDeviceId(deviceId)} / User: ${targetUid ? maskDeviceId(targetUid) : 'Anonymous'}`);

                    const clearUsage = { tier: 'free', ai_pack_credits: 0, ai_docs_this_month: 0, ai_docs_this_week: 0 };
                    const clearAccount = { tier: 'free', ai_pack_credits: 0, ai_docs_weekly: 0, ai_docs_monthly: 0, operations_today: 0, last_operation_reset: new Date().toISOString() };

                    await supabase.from('ag_user_usage').update(clearUsage).eq('device_id', deviceId);
                    if (targetUid) await supabase.from('user_accounts').update(clearAccount).eq('google_uid', targetUid);

                    return res.status(200).json({ success: true, message: 'NUCLEAR_RESET_COMPLETE' });
                }

                // 3. DEDUPLICATION: Prevent Replay Attacks
                if (transactionId) {
                    const { data: existing } = await supabase
                        .from('purchase_transactions')
                        .select('transaction_id')
                        .eq('transaction_id', transactionId)
                        .maybeSingle();

                    if (existing) {
                        console.log(`ℹ️ api/index: Blocking duplicate transaction ${transactionId}`);
                        return res.status(409).json({ error: 'DUPLICATE_TRANSACTION', details: 'This purchase has already been verified.' });
                    }
                }

                // 4. AUTHORITATIVE VERIFICATION: Google Play API
                // SECURITY: Strict Mode - No fallback heuristics (Issue #2 Fix)
                console.log(`🔐 api/index: Verifying purchase with Google Play...`, {
                    productId,
                    transactionId,
                    hasToken: !!purchaseToken,
                    userPreview: maskDeviceId(googleUid || deviceId)
                });

                const isReviewer = false;
                const isVerified = isReviewer || await validateWithGooglePlay(productId, purchaseToken);

                if (!isVerified) {
                    console.error(`❌ api/index: Authoritative verification FAILED for purchase`, {
                        productId,
                        transactionId,
                        device: maskDeviceId(deviceId),
                        user: maskDeviceId(googleUid || 'anonymous'),
                        purchaseTokenPreview: purchaseToken ? purchaseToken.substring(0, 16) + '...' : 'none',
                        timestamp: new Date().toISOString()
                    });
                    return res.status(402).json({
                        error: "PURCHASE_NOT_VALID",
                        details: "Authoritative verification with Google Play failed.",
                        transactionId
                    });
                }

                console.log(`✅ api/index: Purchase verified successfully with Google Play`, {
                    productId,
                    transactionId,
                    timestamp: new Date().toISOString()
                });

                try {
                    let targetTier = null;
                    let creditsToAdd = 0;

                    // 5. PROCESS PRODUCT TYPES (Normalized to Lifetime)
                    if (productId === 'lifetime_pro_access' || productId === 'pro_access_lifetime' || productId === 'monthly_pro_pass') {
                        targetTier = 'lifetime';
                    }

                    // 6. ATOMIC UPDATES
                    if (targetTier) {
                        console.log(`🛡️ GRANTING ${targetTier.toUpperCase()} STATUS`, {
                            productId,
                            transactionId,
                            device: maskDeviceId(deviceId),
                            user: maskDeviceId(googleUid || 'anonymous')
                        });

                        const usageUpdate = await supabase.from('ag_user_usage').upsert(
                            [{ device_id: deviceId, tier: targetTier }],
                            { onConflict: 'device_id' }
                        );
                        console.log('✅ Device usage updated:', { error: usageUpdate.error });

                        if (session?.is_auth && session?.uid) {
                            const accountUpdate = await supabase.from('user_accounts').update({ tier: targetTier }).eq('google_uid', session.uid);
                            console.log('✅ User account updated:', { error: accountUpdate.error });
                        }
                    }

                    if (creditsToAdd > 0) {
                        console.log(`🛡️ Granting ${creditsToAdd} Credits via RPC`);
                        await supabase.rpc('increment_ai_credits', {
                            p_device_id: deviceId,
                            p_google_uid: session?.uid || null,
                            p_amount: creditsToAdd
                        });
                    }

                    // 7. AUDIT LOGGING (Critical for troubleshooting)
                    if (transactionId) {
                        const auditResult = await supabase.from('purchase_transactions').insert([{
                            transaction_id: transactionId,
                            device_id: deviceId,
                            google_uid: session?.uid || null,
                            product_id: productId,
                            purchase_token: purchaseToken,
                            verified_at: new Date().toISOString()
                        }]);
                        console.log('✅ Audit log recorded:', { error: auditResult.error });
                    }

                    console.log(`✅✅✅ PURCHASE COMPLETE AND GRANTED`, {
                        productId,
                        transactionId,
                        tier: targetTier,
                        device: maskDeviceId(deviceId),
                        user: maskDeviceId(googleUid || 'anonymous'),
                        timestamp: new Date().toISOString()
                    });

                    return res.status(200).json({ success: true, verified: true, tier: targetTier, creditsAdded: creditsToAdd });

                } catch (err) {
                    console.error("Purchase Processing Error:", err);
                    return res.status(500).json({ error: "Purchase grant failed" });
                }
            }

            if (requestType === 'usage_fetch') {
                if (session?.is_auth) {
                    try {
                        const { data } = await supabase.from('user_accounts').select('google_uid, tier, updated_at').eq('google_uid', session.uid).single();
                        if (data) return res.status(200).json(data);
                    } catch (e) { }
                }

                try {
                    const { data, error } = await supabase
                        .from('ag_user_usage')
                        .select('device_id, tier, updated_at')
                        .eq('device_id', deviceId)
                        .single();

                    if (error && error.code === 'PGRST116') {
                        const newUser = {
                            device_id: deviceId,
                            tier: 'free',
                            updated_at: new Date().toISOString()
                        };
                        await supabase.from('ag_user_usage').insert([newUser]);
                        return res.status(200).json(newUser);
                    }

                    return res.status(200).json(data);
                } catch (dbError) {
                    console.error("Database Proxy Error:", dbError.message);
                    return res.status(500).json({ error: "Database Sync Error" });
                }
            }

            if (requestType === 'usage_sync') {
                const csrfHeader = req.headers['x-csrf-token'];
                const csrfPayload = verifyCsrfToken(csrfHeader);

                if (!csrfPayload || csrfPayload.uid !== session?.uid) {
                    return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED' });
                }

                try {
                    await supabase
                        .from('ag_user_usage')
                        .upsert([{
                            device_id: deviceId,
                            updated_at: new Date().toISOString()
                        }], { onConflict: 'device_id' });

                    return res.status(200).json({ success: true });
                } catch (syncError) {
                    console.error('API: usage_sync error:', syncError.message);
                    return res.status(500).json({ error: "Usage sync failed" });
                }
            }
        }

        // Execute Data Sync / Time Logic / Purchase Logic
        if (['server_time', 'usage_fetch', 'usage_sync', 'verify_purchase'].includes(requestType)) {
            return await handleBackendLogic();
        }

        // Stage 3: Neural Credit Verification (Supabase) - Only for processing/AI requests
        // SECURITY: CRITICAL VULNERABILITY FIX (P1)
        let usageRecord = null;
        if (supabase && (deviceId || session?.uid) && requestType !== 'guidance') {
            try {
                const currentUid = session?.uid || deviceId;
                const queryTarget = session?.is_auth ? 'google_uid' : 'device_id';
                const tableTarget = session?.is_auth ? 'user_accounts' : 'ag_user_usage';

                const { data: usage, error } = await supabase
                    .from(tableTarget)
                    .select('tier')
                    .eq(queryTarget, currentUid)
                    .single();

                if (error || !usage) {
                    console.error("🛡️ Quota Check Error:", error?.message);
                    return res.status(403).json({ error: "ACCESS_DENIED", details: "User record not found or error." });
                }

                usageRecord = usage;
                const isPaidTier = ['pro', 'premium', 'lifetime'].includes(usage.tier);

                if (!isPaidTier) {
                    return res.status(403).json({
                        error: "NEURAL_LINK_EXHAUSTED",
                        details: "Lifetime Access is required for AI features."
                    });
                }
            } catch (e) {
                console.error("Usage Check Fatal Error:", e);
                return res.status(500).json({ error: "SYSTEM_ERROR", details: "Security check failed." });
            }
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Rate-limited discovery (once every 10 mins)
        const getModels = async () => {
            const now = Date.now();
            if (cachedModels && (now - lastDiscovery < 600000)) return cachedModels;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const data = await response.json();
                if (data.models) {
                    cachedModels = data.models
                        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                        .map(m => m.name.replace('models/', ''));
                    lastDiscovery = now;
                    return cachedModels;
                }
            } catch (e) { }
            return ["gemini-2.5-flash", "gemini-1.5-flash"];
        };


        let { prompt, documentText, type, image, mimeType = 'image/jpeg' } = req.body;

        // QUOTA-SAFE TRUNCATION: Prevent massive documents from nuking the quota
        // Flash models handle 1M tokens, but daily/RPM limits are much tighter
        if (documentText && documentText.length > 100000) {
            console.log("🛡️ Neural Truncation engaged: Clipping context to 100,000 chars.");
            documentText = documentText.substring(0, 100000) + "... [REMAINDER OF OVERSIZED CARRIER TRUNCATED FOR STABILITY]";
        }

        try {
            let modelsToTry = await getModels();
            const errors = [];

            for (const modelName of modelsToTry) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        ],
                        systemInstruction: {
                            parts: [{ text: SYSTEM_INSTRUCTION }],
                            role: "model"
                        }
                    }, { apiVersion: 'v1beta' }); // Switched to v1beta for better image support

                    // SECURITY: CRITICAL VULNERABILITY FIX (P1)
                    // PROMPT INJECTION DEFENSE: Wrap user input in XML tags
                    // This prevents users from "escaping" the context and overriding system instructions.

                    let promptPayload = "";

                    // Helper to sanitize and wrap user content
                    const sanitize = (str) => (str || "").replace(/<\/?(system_instruction|user_input)>/g, "");
                    const wrapUser = (input) => `<user_input>${sanitize(input)}</user_input>`;
                    const wrapDoc = (doc) => `<document_context>${sanitize(doc)}</document_context>`;

                    if (type === 'naming') {
                        promptPayload = `Suggest a professional filename for this document. NO extension, max 40 chars, underscores. CONTEXT: ${wrapDoc(documentText || prompt)}`;
                    } else if (type === 'polisher') {
                        promptPayload = `
**NEURAL SCAN ENHANCEMENT PROTOCOL**
Analyze this scanned image and provide optimization filters to enhance quality while ALWAYS preserving color.

**CRITICAL REQUIREMENTS:**
1. **Always enhance** - Never return neutral values (100/100/0).
2. **Boost contrast** - Range 110-150% for crisp, professional results.
3. **Adjust brightness** - Range 85-105% to balance lighting without overexposure.
4. **ALWAYS preserve color** - Set grayscale=0 for ALL images. Never use grayscale=100.
5. **Detect shadows** - If you see hand shadows or uneven lighting, set shadowPurge=true.

**Output JSON format:**
{
  "brightness": number (85-105, never 100),
  "contrast": number (110-150, never 100),
  "grayscale": 0,
  "sharpness": number (110-150),
  "shadowPurge": boolean,
  "reason": "Brief explanation of adjustments"
}

Analyze the image and return ONLY the JSON object.`;
                    } else if (type === 'audio_script') {
                        promptPayload = `
CONVERT THE FOLLOWING DOCUMENT TEXT INTO A CONCISE, ENGAGING PODCAST-STYLE AUDIO SCRIPT.

STRATEGIC INSTRUCTIONS:
${wrapUser(prompt || "Generate a high-level strategic summary.")}

RULES:
1. START DIRECTLY with the phrase: "Welcome to Anti-Gravity."
2. DO NOT use markdown symbols, stars, or formatting.
3. Keep it conversational.

DOCUMENT TEXT:
${wrapDoc(documentText || "No context provided.")}`;
                    } else if (type === 'table') {
                        // v2.0: Properly structure extraction prompts to prevent prompt leak
                        const extractionInstruction = prompt || `Extract all structured data from this document into JSON format. Output ONLY the raw JSON.`;
                        promptPayload = `
EXTRACTION TASK:
${wrapUser(extractionInstruction)}

DOCUMENT TO ANALYZE:
${wrapDoc(documentText || "No text content - analyzing image only.")}`;
                    } else if (type === 'scrape') {
                        // SSRF Prevention: Validate and sanitize URL
                        const urlStr = prompt.trim();
                        let parsedUrl;
                        try {
                            parsedUrl = new URL(urlStr);
                        } catch {
                            return res.status(400).json({ error: "Invalid URL format" });
                        }

                        // Whitelist allowed protocols
                        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                            return res.status(400).json({ error: "Only HTTP(S) URLs allowed" });
                        }

                        // Block private IP ranges (SSRF prevention)
                        const hostname = parsedUrl.hostname.toLowerCase();
                        const privatePatterns = [
                            /^localhost$/i,
                            /^127\./,
                            /^10\./,
                            /^192\.168\./,
                            /^172\.(1[6-9]|2[0-9]|3[01])\./,
                            /^169\.254\./,  // EC2 metadata endpoint
                            /^::1$/,        // IPv6 loopback
                            /^fc00:/,       // IPv6 private
                            /^fe80:/,       // IPv6 link-local
                            /^\.local$/,    // mDNS
                        ];

                        for (const pattern of privatePatterns) {
                            if (pattern.test(hostname)) {
                                return res.status(400).json({ error: "Access to private networks blocked" });
                            }
                        }

                        // Fetch with timeout and security headers
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                        try {
                            const scrapeResponse = await fetch(urlStr, {
                                signal: controller.signal,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Compatible; Anti-Gravity/1.0)'
                                }
                            });
                            const html = await scrapeResponse.text();
                            const textContent = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .substring(0, 10000);

                            promptPayload = `Clean and structure this web text into a professional document format. INPUT: ${wrapDoc(textContent)}\nFORMAT: Title then paragraphs. NO MARKDOWN.`;
                        } catch (error) {
                            clearTimeout(timeout);
                            if (error.name === 'AbortError') {
                                return res.status(408).json({ error: "Scrape request timeout (10 seconds)" });
                            }
                            return res.status(400).json({ error: "Failed to fetch URL content" });
                        } finally {
                            clearTimeout(timeout);
                        }
                    } else if (type === 'visual') {
                        // NEURAL VISUAL (Nano Banana) SAFETY PROTOCOL
                        const BANNED_KEYWORDS = ['18+', 'nude', 'nsfw', 'porn', 'sex', 'violence', 'blood', 'gore', 'kill', 'attack', 'weapon', 'drug', 'abuse', 'illegal'];
                        const lowerPrompt = prompt.toLowerCase();
                        const isBanned = BANNED_KEYWORDS.some(word => lowerPrompt.includes(word));

                        if (isBanned) {
                            return res.status(400).json({ error: "Safety Violation: Prohibited content requested." });
                        }

                        // Strict instruction for image generation
                        promptPayload = `Generate a professional, high-quality image based on this request. ADHERE TO SAFETY POLICIES: NO VIOLENCE, NO NSFW, NO HATE. REQUEST: ${wrapUser(prompt)}`;

                        // Specific model for visuals - include 2.0 standards
                        const allowedModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-image', 'imagen-3', 'gemini-1.5-flash'];
                        if (!allowedModels.includes(modelName)) {
                            continue;
                        }
                    } else if (type === 'mindmap' || type === 'outline' || type === 'audio_script' || type === 'redact' || type === 'table') {
                        // For these types with images, use image-friendly system instruction

                        if (image && (!documentText || documentText.trim() === '')) {
                            // Image only - analyze the image directly
                            const imageInstruction = `Analyze the provided image to extract information and insights.`;
                            promptPayload = `${imageInstruction}\n\n${wrapUser(prompt)}`;
                        } else {
                            // Text or PDF - include document context
                            promptPayload = `QUERY: ${wrapUser(prompt)}\n\nDOCUMENT CONTEXT:\n${wrapDoc(documentText || "No context provided.")}`;
                        }
                    } else {
                        promptPayload = `QUERY: ${wrapUser(prompt)}\n\nDOCUMENT CONTEXT:\n${wrapDoc(documentText || "No context provided.")}`;
                    }

                    let contents = [{ text: promptPayload }];
                    if (image) {
                        const images = Array.isArray(image) ? image : [image];
                        images.forEach(img => {
                            if (img && typeof img === 'string' && img.length > 50) { // Ensure valid base64
                                contents.push({
                                    inlineData: {
                                        data: img.includes('base64,') ? img.split('base64,')[1] : img,
                                        mimeType
                                    }
                                });
                            }
                        });
                    }

                    const result = await model.generateContent(contents);
                    const response = await result.response;
                    const text = response.text();

                    // Safety check for visual content
                    if (type === 'visual') {
                        const lowerText = text.toLowerCase();
                        if (lowerText.length < 200 && (lowerText.includes("i can't help") || lowerText.includes("safety"))) {
                            return res.status(400).json({ error: "Safety Violation: Asset discarded by Neural Guard." });
                        }
                    }

                    // AI usage tracking removed - unlimited for lifetime tiers.

                    return res.status(200).json({ text: text });

                } catch (err) {
                    errors.push(`${modelName}: ${err.message}`);
                }
            }

            return res.status(500).json({
                error: "Neural Sync Failed.",
                details: errors.join(" | ")
            });
        } catch (error) {
            const isRateLimit = error.message?.includes('429') || error.message?.includes('Quota');
            res.status(isRateLimit ? 429 : 500).json({
                error: isRateLimit ? "AI_RATE_LIMIT" : (error.message || "Protocol Failure")
            });
        }
    } catch (fatalError) {
        console.error("FATAL API CRASH:", fatalError);
        // Ensure CORS headers are present even on fatal crash
        const origin = req.headers.origin;
        if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
        res.status(500).json({
            error: "CRITICAL_SYSTEM_FAILURE",
            details: fatalError.message
        });
    }
}
