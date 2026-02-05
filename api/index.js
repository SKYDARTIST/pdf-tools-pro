import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import crypto from 'crypto';
import { Resend } from 'resend';

// Email notification service
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'antigravitybybulla@gmail.com';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'resend'; // 'resend' or 'sendgrid'

/**
 * Send payment notification email to owner
 */
async function sendPaymentNotification(eventType, data) {
    try {
        if (!OWNER_EMAIL) {
            console.warn('⚠️ OWNER_EMAIL not configured. Email notifications disabled.');
            return;
        }

        let subject = '';
        let htmlContent = '';

        if (eventType === 'payment_success') {
            subject = `💰 Payment Received: Lifetime Access Purchased`;
            htmlContent = `
                <h2 style="color: #10b981;">✅ Payment Successful</h2>
                <p><strong>Product:</strong> Lifetime Pro Access</p>
                <p><strong>Transaction ID:</strong> <code>${data.transactionId}</code></p>
                <p><strong>Device ID:</strong> <code>${data.deviceId}</code></p>
                <p><strong>User ID:</strong> ${data.googleUid || 'Anonymous'}</p>
                <p><strong>Amount:</strong> Lifetime Access (One-time)</p>
                <p><strong>Verified at:</strong> ${new Date().toISOString()}</p>
                <hr>
                <p style="color: #6b7280; font-size: 12px;">
                    This is an automated notification from your PDF Tools Pro payment system.
                </p>
            `;
        } else if (eventType === 'payment_failed') {
            subject = `⚠️ Payment Verification Failed: Manual Review Needed`;
            htmlContent = `
                <h2 style="color: #ef4444;">❌ Payment Verification Failed</h2>
                <p><strong>Product:</strong> Lifetime Pro Access</p>
                <p><strong>Transaction ID:</strong> <code>${data.transactionId}</code></p>
                <p><strong>Device ID:</strong> <code>${data.deviceId}</code></p>
                <p><strong>User ID:</strong> ${data.googleUid || 'Anonymous'}</p>
                <p><strong>Error:</strong> ${data.error}</p>
                <p><strong>Details:</strong> ${data.details}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <hr>
                <p style="color: #ef4444; font-weight: bold;">
                    ⚠️ ACTION REQUIRED: This purchase may need manual verification.
                    The customer's payment was processed by Google, but your server couldn't verify it.
                </p>
                <p>
                    <strong>Next Steps:</strong>
                    <ol>
                        <li>Check Vercel logs for detailed error information</li>
                        <li>Verify the transaction with Google Play Console</li>
                        <li>Manually grant access if verified, or contact the customer</li>
                    </ol>
                </p>
            `;
        } else if (eventType === 'payment_pending') {
            subject = `⏳ Pending Payment Recovery: Retry Scheduled`;
            htmlContent = `
                <h2 style="color: #f59e0b;">⏳ Payment Pending</h2>
                <p><strong>Product:</strong> Lifetime Pro Access</p>
                <p><strong>Transaction ID:</strong> <code>${data.transactionId}</code></p>
                <p><strong>Device ID:</strong> <code>${data.deviceId}</code></p>
                <p><strong>Pending Since:</strong> ${new Date(data.addedAt).toISOString()}</p>
                <p><strong>Age:</strong> ${Math.round((Date.now() - data.addedAt) / 1000 / 60)} minutes</p>
                <hr>
                <p>
                    ℹ️ This payment is in the queue for automatic retry every 30 seconds.
                    It will be automatically verified when the backend connection improves.
                </p>
            `;
        }

        // Send email based on configured service
        if (EMAIL_SERVICE === 'resend') {
            await sendViaResend(OWNER_EMAIL, subject, htmlContent);
        } else if (EMAIL_SERVICE === 'sendgrid') {
            await sendViaSendGrid(OWNER_EMAIL, subject, htmlContent);
        } else {
            console.warn(`⚠️ Unknown email service: ${EMAIL_SERVICE}`);
        }

        console.log(`📧 Payment notification sent: ${eventType}`);
    } catch (error) {
        console.error('❌ Failed to send payment notification:', error.message);
        // Don't block payment flow if email fails
    }
}

/**
 * Send email via Resend (modern email service)
 */
async function sendViaResend(to, subject, htmlContent) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.warn('⚠️ RESEND_API_KEY not configured. Install: npm install resend');
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: 'payments@antigravity.app',
                to: to,
                subject: subject,
                html: htmlContent
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Resend API error');
        }
    } catch (error) {
        console.error('❌ Resend email failed:', error.message);
        throw error;
    }
}

/**
 * Send email via SendGrid (alternative)
 */
async function sendViaSendGrid(to, subject, htmlContent) {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
        console.warn('⚠️ SENDGRID_API_KEY not configured. Install: npm install @sendgrid/mail');
        return;
    }

    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sendGridApiKey}`
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: 'noreply@antigravity.app', name: 'PDF Tools Pro' },
                subject: subject,
                content: [{ type: 'text/html', value: htmlContent }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errors?.[0]?.message || 'SendGrid API error');
        }
    } catch (error) {
        console.error('❌ SendGrid email failed:', error.message);
        throw error;
    }
}

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
const MAX_REQUESTS = 15; // 15 reqs/min - purchase flow needs ~4-5 calls (handshake + verify + status + usage)
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
            // Add 5 second timeout to Google Play API call
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            let res;
            try {
                res = await api.purchases.subscriptions.get({
                    packageName: PACKAGE_NAME,
                    subscriptionId: productId,
                    token: purchaseToken,
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }

            // SECURITY (V5): Verify Acknowledgment + Payment (ACTUAL PAYMENT ONLY) + Expiry
            const isAcknowledged = res.data.acknowledgementState === 1;

            // P0 FIX: REJECT free trials explicitly
            // paymentState: 0=free trial, 1=paid, 2=free trial (legacy)
            const paymentState = res.data.paymentState;
            const purchaseState = res.data.purchaseState; // 0=purchased, 1=canceled
            const expiryTime = res.data.expiryTimeMillis ? parseInt(res.data.expiryTimeMillis) : 0;
            const isActive = expiryTime > now;

            if (paymentState !== 1) {
                console.warn(`🛡️ Anti-Gravity Security: Rejecting non-paid subscription (paymentState=${paymentState})`, {
                    productId,
                    isFreeTrial: paymentState === 0 || paymentState === 2
                });
                return false;
            }

            if (purchaseState !== 0) {
                console.warn(`🛡️ Anti-Gravity Security: Rejecting cancelled subscription (purchaseState=${purchaseState})`);
                return false;
            }

            if (!isAcknowledged && IS_PRODUCTION) {
                console.warn(`Anti-Gravity Security: Unacknowledged purchase detected for ${productId}`);
                return false;
            }

            return isActive;
        } else {
            // Add 5 second timeout to Google Play API call
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            let res;
            try {
                res = await api.purchases.products.get({
                    packageName: PACKAGE_NAME,
                    productId: productId,
                    token: purchaseToken,
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }

            // Verify purchase state (0=purchased, 1=canceled)
            const isPurchased = res.data.purchaseState === 0;
            const isAcknowledged = res.data.acknowledgementState === 1;

            // NOTE: Do NOT reject unacknowledged INAPP purchases.
            // Google Play takes time to propagate acknowledgement after client calls acknowledgePurchase().
            // The purchase is valid as soon as purchaseState === 0 (purchased).
            // Google auto-acknowledges after 3 days if not acknowledged manually.
            if (!isAcknowledged) {
                console.log(`ℹ️ Anti-Gravity: Unacknowledged INAPP product (will auto-acknowledge). Proceeding with verification.`, { productId });
            }

            if (!isPurchased) {
                console.warn(`🛡️ Anti-Gravity Security: Product not purchased (purchaseState=${res.data.purchaseState})`);
                return false;
            }

            return true;
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
                // Fail-Open for general requests (non-critical), but purchase endpoints are fail-closed below
                console.error('Anti-Gravity Security: Rate Limit KV Error:', kvError.message);
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
        const generateSessionToken = async (uid, isAuth = false, email = null) => {
            const now = Date.now();
            const exp = now + (60 * 60 * 1000); // 1 hour
            const payload = JSON.stringify({
                uid: uid,
                is_auth: isAuth,
                email: email,
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

        // Helper: Verify CSRF Token (Verified with Session Secret + purpose check)
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

                // SECURITY: Reject session tokens used as CSRF tokens
                // Accept both new 'csrf' purpose tokens and legacy tokens (without purpose field) for backwards compat
                if (payload.purpose && payload.purpose !== 'csrf') return null;

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
            const sessionToken = await generateSessionToken(targetUid, !!verifiedUid, profile?.email);

            // SECURITY FIX: Generate CSRF token with distinct purpose to prevent session token reuse as CSRF
            const csrfNow = Date.now();
            const csrfExp = csrfNow + (60 * 60 * 1000);
            const csrfPayloadStr = JSON.stringify({
                uid: targetUid,
                purpose: 'csrf',
                iat: csrfNow,
                exp: csrfExp,
                jti: Buffer.from(`csrf-${targetUid}-${csrfNow}-${randomBytes(8).toString('hex')}`).toString('base64')
            });
            const csrfSig = createHmac('sha256', sessionSecret).update(csrfPayloadStr).digest('hex');
            const csrfToken = Buffer.from(csrfPayloadStr).toString('base64') + '.' + csrfSig;

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
            'exchange_google_code',      // Exchange OAuth code for tokens (Fixes client_secret error)
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

            if (requestType === 'exchange_google_code') {
                const { code, codeVerifier, redirectUri } = req.body;

                if (!code) {
                    return res.status(400).json({ error: 'Missing authorization code' });
                }

                try {
                    // Use standard fetch if available, otherwise fallback (Vercel Node 18+ has global fetch)
                    const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: process.env.VITE_GOOGLE_OAUTH_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET,
                            grant_type: 'authorization_code',
                            code: code,
                            redirect_uri: redirectUri,
                            code_verifier: codeVerifier || '',
                        }),
                    });

                    const tokens = await response.json();

                    if (!response.ok || tokens.error) {
                        console.error('Neural Auth: Google Token Exchange Failed:', tokens);
                        return res.status(response.status).json({
                            error: tokens.error_description || tokens.error || 'Exchange failed'
                        });
                    }

                    return res.status(200).json(tokens);
                } catch (error) {
                    console.error("Neural Auth: Fatal Token Exchange Error:", error.message);
                    return res.status(500).json({ error: "Inter-orbital Exchange Failed" });
                }
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
                        // SAFETY: Skip re-validation if no purchase token stored
                        // This prevents downgrading users who purchased before we stored the token
                        // Lifetime one-time purchases don't expire, so trusting the DB tier is safe
                        if (!user.active_purchase_token) {
                            console.log(`ℹ️ Subscription check: No active_purchase_token for ${maskDeviceId(session.uid)}, skipping re-validation (tier: ${user.tier})`);
                            await supabase.from('user_accounts').update({ last_subscription_check: new Date().toISOString() }).eq('google_uid', session.uid);
                        } else {
                            const productId = user.tier === 'lifetime' ? 'lifetime_pro_access' : 'monthly_pro_pass';
                            const isStillActive = await validateWithGooglePlay(productId, user.active_purchase_token);

                            if (!isStillActive) {
                                // Only downgrade subscriptions, not lifetime purchases
                                // Lifetime INAPP purchases never expire - Google Play may return false
                                // if the token format doesn't match a subscription lookup
                                if (user.tier === 'lifetime') {
                                    console.log(`ℹ️ Subscription check: Lifetime user re-validation returned false (expected for INAPP). Keeping tier.`, { uid: maskDeviceId(session.uid) });
                                    await supabase.from('user_accounts').update({ last_subscription_check: new Date().toISOString() }).eq('google_uid', session.uid);
                                } else {
                                    await supabase.from('user_accounts').update({ tier: 'free', last_subscription_check: new Date().toISOString() }).eq('google_uid', session.uid);
                                    return res.status(200).json({ tier: 'free', active: false, expired: true });
                                }
                            } else {
                                await supabase.from('user_accounts').update({ last_subscription_check: new Date().toISOString() }).eq('google_uid', session.uid);
                            }
                        }
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
                // SECURITY: Fail-CLOSED for purchase endpoints - reject if KV unavailable
                if (!kv) {
                    console.error('🛡️ Anti-Gravity Security: KV unavailable - blocking purchase verification (fail-closed)');
                    return res.status(503).json({ error: 'RATE_LIMIT_UNAVAILABLE', details: 'Security service temporarily unavailable. Please retry.' });
                }

                if (deviceId) {
                    const burstKey = `rl:purchase:burst:${deviceId}`;
                    const sustainKey = `rl:purchase:sustain:${deviceId}`;

                    try {
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
                    } catch (kvError) {
                        console.error('🛡️ Anti-Gravity Security: Purchase rate limit KV error (fail-closed):', kvError.message);
                        return res.status(503).json({ error: 'RATE_LIMIT_ERROR', details: 'Security check failed. Please retry.' });
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

                // 3. DEDUPLICATION: P0 FIX - Use database constraint instead of SELECT+INSERT
                // The following comment explains why we DON'T do SELECT before INSERT:
                // Race condition: Thread1 selects(not found) -> Thread2 selects(not found) -> Thread1 inserts -> Thread2 inserts(ERROR)
                // Solution: Let database constraint handle it, catch 23505 (unique violation)
                // This atomic operation prevents the race condition entirely.

                // We'll insert audit log FIRST (before granting tier) to ensure atomicity
                // If insertion fails due to DUPLICATE, we know transaction was already processed
                const auditLog = {
                    transaction_id: transactionId,
                    device_id: deviceId,
                    google_uid: session?.uid || null,
                    product_id: productId,
                    purchase_token: purchaseToken,
                    status: 'pending',  // Mark as pending initially
                    verified_at: new Date().toISOString()
                };

                // 4. AUTHORITATIVE VERIFICATION: Google Play API
                // SECURITY: Strict Mode - No fallback heuristics (Issue #2 Fix)
                console.log(`🔐 api/index: Verifying purchase with Google Play...`, {
                    productId,
                    transactionId,
                    hasToken: !!purchaseToken,
                    userPreview: maskDeviceId(googleUid || deviceId)
                });

                const isVerified = await validateWithGooglePlay(productId, purchaseToken);

                if (!isVerified) {
                    console.error(`❌ api/index: Authoritative verification FAILED for purchase`, {
                        productId,
                        transactionId,
                        device: maskDeviceId(deviceId),
                        user: maskDeviceId(googleUid || 'anonymous'),
                        purchaseTokenPreview: purchaseToken ? purchaseToken.substring(0, 16) + '...' : 'none',
                        timestamp: new Date().toISOString()
                    });

                    // Send payment failed notification email
                    await sendPaymentNotification('payment_failed', {
                        transactionId,
                        deviceId: maskDeviceId(deviceId),
                        googleUid: googleUid || 'Anonymous',
                        error: 'PURCHASE_NOT_VALID',
                        details: 'Authoritative verification with Google Play failed'
                    }).catch(e => console.warn('Failed to send failure notification:', e));

                    // LOG FAILURE TO DB
                    if (transactionId) {
                        await supabase.from('purchase_transactions').insert([{
                            transaction_id: transactionId,
                            device_id: deviceId,
                            google_uid: googleUid || null,
                            product_id: productId,
                            purchase_token: purchaseToken,
                            status: 'failed',
                            error_message: 'Authoritative verification with Google Play failed.',
                            verified_at: new Date().toISOString()
                        }]);
                    }

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

                    // P0 FIX: 6. INSERT AUDIT LOG FIRST (before granting tier)
                    // This prevents the "tier granted but no audit record" scenario
                    // Database constraint prevents duplicates (unique violation = already processed)
                    if (transactionId) {
                        const auditInsert = await supabase.from('purchase_transactions').insert([{
                            transaction_id: transactionId,
                            device_id: deviceId,
                            google_uid: session?.uid || null,
                            product_id: productId,
                            purchase_token: purchaseToken,
                            status: 'success',
                            verified_at: new Date().toISOString()
                        }]);

                        // Check for unique constraint violation (means this transaction was already processed)
                        if (auditInsert.error) {
                            if (auditInsert.error.code === '23505') {
                                // UNIQUE constraint violation - transaction already processed
                                console.log(`ℹ️ Duplicate transaction detected (already processed): ${transactionId}`);
                                return res.status(409).json({
                                    error: 'DUPLICATE_TRANSACTION',
                                    details: 'This purchase has already been verified.',
                                    transactionId
                                });
                            } else {
                                // Other database error
                                console.error(`❌ CRITICAL: Audit log insertion failed:`, auditInsert.error);
                                // Send critical alert
                                await sendPaymentNotification('payment_failed', {
                                    transactionId,
                                    deviceId: maskDeviceId(deviceId),
                                    googleUid: googleUid || 'Anonymous',
                                    error: 'AUDIT_INSERT_FAILED',
                                    details: `Database error: ${auditInsert.error.message}`
                                }).catch(e => console.warn('Failed to send failure notification:', e));
                                return res.status(500).json({
                                    error: 'AUDIT_FAILED',
                                    details: 'Failed to record transaction in audit log'
                                });
                            }
                        }
                        console.log('✅ Audit log recorded first');
                    }

                    // 7. NOW GRANT TIER (after audit is safely recorded)
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
                            const accountUpdate = await supabase.from('user_accounts').update({
                                tier: targetTier,
                                active_purchase_token: purchaseToken
                            }).eq('google_uid', session.uid);
                            console.log('✅ User account updated:', { error: accountUpdate.error });
                        } else if (deviceId) {
                            // CRITICAL FIX: For anonymous/device-only sessions, try to find a user_account
                            // linked to this device and update it too. This prevents drift reconciliation
                            // from downgrading a user who purchased before logging in with Google.
                            try {
                                const { data: linkedAccount } = await supabase
                                    .from('ag_user_usage')
                                    .select('device_id')
                                    .eq('device_id', deviceId)
                                    .single();

                                if (linkedAccount) {
                                    // Find any user_accounts that have used this device
                                    // Update ALL matching accounts to prevent drift on any linked Google account
                                    const { data: linkedUsers } = await supabase
                                        .from('sessions')
                                        .select('user_uid')
                                        .eq('device_id', deviceId)
                                        .not('user_uid', 'eq', deviceId); // Exclude device-only sessions

                                    if (linkedUsers && linkedUsers.length > 0) {
                                        for (const linked of linkedUsers) {
                                            await supabase.from('user_accounts').update({
                                                tier: targetTier,
                                                active_purchase_token: purchaseToken
                                            }).eq('google_uid', linked.user_uid);
                                        }
                                        console.log('✅ Linked user accounts also updated:', { count: linkedUsers.length });
                                    }
                                }
                            } catch (linkError) {
                                console.warn('⚠️ Could not update linked user accounts:', linkError.message);
                                // Non-blocking - device usage is already updated
                            }
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

                    console.log(`✅✅✅ PURCHASE COMPLETE AND GRANTED`, {
                        productId,
                        transactionId,
                        tier: targetTier,
                        device: maskDeviceId(deviceId),
                        user: maskDeviceId(googleUid || 'anonymous'),
                        timestamp: new Date().toISOString()
                    });

                    // Send payment success notification email
                    await sendPaymentNotification('payment_success', {
                        transactionId,
                        deviceId: maskDeviceId(deviceId),
                        googleUid: googleUid || 'Anonymous'
                    }).catch(e => console.warn('Failed to send success notification:', e));

                    return res.status(200).json({ success: true, verified: true, tier: targetTier, creditsAdded: creditsToAdd });

                } catch (err) {
                    console.error("Purchase Processing Error:", err);
                    return res.status(500).json({ error: "Purchase grant failed" });
                }
            }

            // ADMIN RECOVERY: Force sync a verified purchase without strict CSRF
            // This is for cases where payment succeeded but sync failed due to session issues
            if (requestType === 'admin_force_sync_purchase') {
                const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').filter(Boolean);
                const isAdmin = ADMIN_UIDS.includes(session?.uid);

                if (!isAdmin) {
                    console.warn(`🛡️ Anti-Gravity Security: Unauthorized admin_force_sync attempt by ${maskDeviceId(session?.uid || deviceId)}`);
                    return res.status(403).json({ error: 'UNAUTHORIZED', details: 'Admin privileges required.' });
                }

                const { targetDeviceId, targetGoogleUid, purchaseToken, productId, transactionId } = req.body;

                if (!purchaseToken || !productId) {
                    return res.status(400).json({ error: 'INVALID_REQUEST', details: 'Missing purchaseToken or productId' });
                }

                console.log(`☢️ ADMIN FORCE SYNC INITIATED by ${maskDeviceId(session.uid)}`, {
                    targetDeviceId: maskDeviceId(targetDeviceId),
                    targetGoogleUid: maskDeviceId(targetGoogleUid),
                    productId,
                    transactionId
                });

                // Step 1: Verify with Google Play (REQUIRED - we don't bypass this)
                const isVerified = await validateWithGooglePlay(productId, purchaseToken);
                if (!isVerified) {
                    return res.status(402).json({ error: 'PURCHASE_NOT_VALID', details: 'Google Play verification failed' });
                }

                console.log(`✅ Admin Force Sync: Google Play verified purchase`);

                // Step 2: Insert audit log
                if (transactionId) {
                    const auditInsert = await supabase.from('purchase_transactions').insert([{
                        transaction_id: transactionId,
                        device_id: targetDeviceId || deviceId,
                        google_uid: targetGoogleUid || null,
                        product_id: productId,
                        purchase_token: purchaseToken,
                        status: 'success_admin_recovery',
                        verified_at: new Date().toISOString()
                    }]);

                    if (auditInsert.error && auditInsert.error.code !== '23505') {
                        console.error('Admin Force Sync: Audit insert failed:', auditInsert.error);
                    }
                }

                // Step 3: Grant tier
                const targetTier = 'lifetime';

                if (targetDeviceId) {
                    await supabase.from('ag_user_usage').upsert(
                        [{ device_id: targetDeviceId, tier: targetTier }],
                        { onConflict: 'device_id' }
                    );
                    console.log(`✅ Admin Force Sync: Updated ag_user_usage for device ${maskDeviceId(targetDeviceId)}`);
                }

                if (targetGoogleUid) {
                    await supabase.from('user_accounts').update({
                        tier: targetTier,
                        active_purchase_token: purchaseToken
                    }).eq('google_uid', targetGoogleUid);
                    console.log(`✅ Admin Force Sync: Updated user_accounts for ${maskDeviceId(targetGoogleUid)}`);
                }

                return res.status(200).json({
                    success: true,
                    message: 'ADMIN_FORCE_SYNC_COMPLETE',
                    tier: targetTier,
                    targetDeviceId: maskDeviceId(targetDeviceId),
                    targetGoogleUid: maskDeviceId(targetGoogleUid)
                });
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

                    return res.status(200).json(data || { device_id: deviceId, tier: 'free', updated_at: new Date().toISOString() });
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
                    const syncData = {
                        device_id: deviceId,
                        updated_at: new Date().toISOString()
                    };

                    // Include tier from request body if provided
                    // SECURITY: Only allow upgrade syncs, never allow downgrade via this endpoint
                    // Downgrades must go through verify_purchase or check_subscription_status
                    const clientUsage = req.body.usage;
                    if (clientUsage?.tier && clientUsage.tier !== 'free') {
                        syncData.tier = clientUsage.tier;
                    }

                    await supabase
                        .from('ag_user_usage')
                        .upsert([syncData], { onConflict: 'device_id' });

                    // Also sync to user_accounts if authenticated
                    if (session?.is_auth && session?.uid && clientUsage?.tier) {
                        await supabase.from('user_accounts').update({
                            tier: clientUsage.tier
                        }).eq('google_uid', session.uid);
                    }

                    return res.status(200).json({ success: true });
                } catch (syncError) {
                    console.error('API: usage_sync error:', syncError.message);
                    return res.status(500).json({ error: "Usage sync failed" });
                }
            }

            if (requestType === 'admin_fetch_payments') {
                if (!session?.is_auth || session.email !== OWNER_EMAIL) {
                    return res.status(403).json({ error: 'ADMIN_ACCESS_REQUIRED' });
                }

                try {
                    const { data, error } = await supabase
                        .from('purchase_transactions')
                        .select(`
                            *,
                            user_accounts (
                                name,
                                email
                            )
                        `)
                        .order('verified_at', { ascending: false })
                        .limit(100);

                    if (error) throw error;
                    return res.status(200).json(data);
                } catch (adminError) {
                    console.error('Admin Fetch Error:', adminError.message);
                    return res.status(500).json({ error: "Admin data fetch failed" });
                }
            }

            if (requestType === 'admin_grant_access') {
                if (!session?.is_auth || session.email !== OWNER_EMAIL) {
                    return res.status(403).json({ error: 'ADMIN_ACCESS_REQUIRED' });
                }

                const { targetUid, targetDeviceId, targetTier } = req.body;

                try {
                    // AUDIT: Log admin grant action
                    await supabase.from('purchase_transactions').insert([{
                        transaction_id: `admin_grant_${Date.now()}_${targetUid || targetDeviceId}`,
                        device_id: targetDeviceId || 'admin_grant',
                        google_uid: targetUid || null,
                        product_id: 'admin_manual_grant',
                        purchase_token: `granted_by_${session.email}`,
                        status: 'success',
                        verified_at: new Date().toISOString()
                    }]);

                    if (targetUid) {
                        await supabase.from('user_accounts').update({ tier: targetTier }).eq('google_uid', targetUid);
                    }
                    if (targetDeviceId) {
                        await supabase.from('ag_user_usage').upsert([{ device_id: targetDeviceId, tier: targetTier }], { onConflict: 'device_id' });
                    }
                    console.log(`☢️ ADMIN GRANT: ${session.email} granted ${targetTier} to UID:${maskDeviceId(targetUid || '')} Device:${maskDeviceId(targetDeviceId || '')}`);
                    return res.status(200).json({ success: true });
                } catch (grantError) {
                    return res.status(500).json({ error: "Manual grant failed" });
                }
            }

            if (requestType === 'admin_get_stats') {
                if (!session?.is_auth || session.email !== OWNER_EMAIL) {
                    return res.status(403).json({ error: 'ADMIN_ACCESS_REQUIRED' });
                }

                try {
                    const { data: revData } = await supabase.from('purchase_transactions').select('amount').eq('status', 'success');
                    const totalRevenue = revData?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0;

                    const { count: userCount } = await supabase.from('user_accounts').select('*', { count: 'exact', head: true });
                    const { count: failedCount } = await supabase.from('purchase_transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed');

                    return res.status(200).json({
                        totalRevenue,
                        userCount,
                        failedCount
                    });
                } catch (statsError) {
                    return res.status(500).json({ error: "Stats fetch failed" });
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
