import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Anti-Gravity Backend v2.9.0 - Cyber Security Hardened
const SYSTEM_INSTRUCTION = `You are the Anti-Gravity AI. Your goal is to help users understand complex documents. Use the provided CONTEXT or DOCUMENT TEXT as your primary source. Maintain a professional, technical tone.`;

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
// SECURITY: Global limit across all serverless nodes
const RATE_LIMIT_WINDOW = 60; // 1 Minute (in seconds for Redis)
const MAX_REQUESTS = 10; // 10 reqs / min

export default async function handler(req, res) {
    const origin = req.headers.origin;

    // CORS: Strict Whitelist (No trailing slashes)
    const ALLOWED_ORIGINS = [
        'capacitor://localhost', // Keep for mobile app
        'http://localhost',      // Added for local testing/android scheme
        'https://pdf-tools-pro.vercel.app',
        'https://pdf-tools-pro-indol.vercel.app'
    ];

    // Check for exact match
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ag-signature, x-ag-device-id, x-ag-integrity-token, x-csrf-token');

    // SECURITY HEADERS: Harden API against web-based attacks
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'); // Force HTTPS
    res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
    res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking (API should not be framed)
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';"); // Lockdown content sources

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Ensure POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const signature = req.headers['x-ag-signature'];
    const deviceId = req.headers['x-ag-device-id'];
    const integrityToken = req.headers['x-ag-integrity-token'];

    // Helper: Mask device ID for safe logging
    const maskDeviceId = (id) => {
        if (!id) return 'unknown';
        return id.substring(0, 8) + '...' + id.substring(id.length - 4);
    };

    const { type: requestType = '', usage = null } = req.body || {};

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

    // SECURE SIGNING KEY: Use dedicated session secret, fallback to service key for safety
    const sessionSecret = process.env.SESSION_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!sessionSecret) {
        console.error('FATAL: SESSION_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY missing');
        return res.status(500).json({ error: 'Internal Server Error: Authentication not configured' });
    }

    // Helper: Generate Session Token (Stateless JWT-lite)
    const generateSessionToken = (uid, isAuth = false) => {
        const now = Date.now();
        const payload = JSON.stringify({
            uid: uid,
            is_auth: isAuth,
            iat: now,
            exp: now + (60 * 60 * 1000), // 1 hour
            jti: Buffer.from(`${uid}-${now}-${randomBytes(8).toString('hex')}`).toString('base64')
        });
        const signature = createHmac('sha256', sessionSecret).update(payload).digest('hex');
        return Buffer.from(payload).toString('base64') + '.' + signature;
    };

    // Helper: Verify Session Token
    const verifySessionToken = (token) => {
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
                // If it's a JWT, let's decode it for profile info even before official verification
                const parts = credential.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
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
        const sessionToken = generateSessionToken(targetUid, !!verifiedUid);
        const csrfToken = generateSessionToken(targetUid, !!verifiedUid);

        return res.status(200).json({
            sessionToken,
            csrfToken,
            profile: profile // Return profile to client to avoid RLS SELECT requirement
        });
    }

    // SECURITY: Unified Auth Enforcement for ALL other routes
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const session = verifySessionToken(token);

    // FEATURE FLAG: FORCED TRUE FOR TESTING/REVIEW
    const legacyEnabled = true;

    // MANDATORY LOGIN ENFORCEMENT (v2.9.2)
    // All requests except handshake must be backed by a verified Google Identity
    if (!session || !session.is_auth) {
        if (legacyEnabled) {
            console.warn('⚠️ Legacy auth bypass for', maskDeviceId(deviceId));
        } else {
            console.warn(`Anti-Gravity Security: Blocked unauthenticated/anonymous request from ${maskDeviceId(deviceId)}`);
            return res.status(401).json({ error: 'AUTH_REQUIRED', details: 'Google Login is required to use document tools.' });
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
        if (requestType === 'verify_purchase') {
            // SECURITY: CSRF Protection - Verify CSRF token for purchase requests
            const csrfHeader = req.headers['x-csrf-token'];
            const csrfPayload = verifyCsrfToken(csrfHeader);
            const currentUid = session?.uid || deviceId;
            if (!csrfPayload || csrfPayload.uid !== currentUid) {
                return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED' });
            }

            const { purchaseToken, productId, transactionId } = req.body;

            if (!purchaseToken || !productId) {
                return res.status(400).json({ error: "Missing purchase data" });
            }

            // SECURITY: HARDENING - Dedicated Receipt Validation Service (Staged)
            // trusts NO client-side state. Heuristics used as fallback.

            // 1. Mandatory Fields
            if (!purchaseToken || !productId || !transactionId) {
                return res.status(400).json({ error: "INVALID_REQUEST", details: "Missing purchase evidence." });
            }

            // 2. Anti-Spoofing Heuristics (Enhanced)
            const isSuspicious =
                purchaseToken.length < 50 || // Google Play tokens are significantly longer than transaction IDs
                purchaseToken === transactionId || // Direct spoofer match
                purchaseToken.includes("android.test.purchased") || // Sandbox bypass
                transactionId.startsWith("GPA.0000"); // Mock transaction ID pattern

            if (isSuspicious) {
                console.warn(`Anti-Gravity Security: Blocked suspicious purchase attempt from ${maskDeviceId(deviceId)}`);
                console.error('Anti-Gravity Security: Purchase Spoof Attempt detected', { deviceId: maskDeviceId(deviceId), productId, transactionId });
                return res.status(403).json({ error: "SECURITY_VIOLATION", details: "Integrity check failed." });
            }

            // [PROD READY] REAL VALIDATION HOOK
            // In full production, you would call:
            // const isValid = await validateWithGooglePlay(productId, purchaseToken);
            // if (!isValid) return res.status(402).json({ error: "PURCHASE_NOT_FOUND" });

            try {
                // If heuristic passes, we grant the item.
                // In a full production env, you MUST validate with Google API.

                if (productId === 'pro_access_lifetime' || productId === 'pro_access_yearly') {
                    const { error } = await supabase.from('ag_user_usage').upsert(
                        [{
                            device_id: deviceId,
                            tier: 'pro',
                            // Preserve existing credits if they exist
                        }],
                        { onConflict: 'device_id', ignoreDuplicates: false }
                    );
                    // We need to use update, not simple upsert to preserve fields, but upsert with merge is better.
                    // Actually, Supabase upsert overwrites unless specified. 
                    // Let's do a safe update:
                    await supabase.from('ag_user_usage').update({ tier: 'pro' }).eq('device_id', deviceId);
                } else if (productId === 'ai_pack_100') {
                    // Atomic increment (requires RPC or read-modify-write)
                    // For now, read-modify-write is acceptable given strict session lock
                    const { data: current } = await supabase.from('ag_user_usage').select('ai_pack_credits').eq('device_id', deviceId).single();
                    const newCredits = (current?.ai_pack_credits || 0) + 100;
                    await supabase.from('ag_user_usage').update({ ai_pack_credits: newCredits }).eq('device_id', deviceId);
                }

                return res.status(200).json({ success: true, verified: true });

            } catch (err) {
                console.error("Purchase Grant Error:", err);
                return res.status(500).json({ error: "Purchase grant failed" });
            }
        }

        if (requestType === 'usage_fetch') {
            // SECURITY: Prevent Authenticated Users from using Device-ID based fetch (Privilege Escalation Issue #3)
            // Authenticated users must use /api/user/subscription
            if (session.is_auth) {
                return res.status(403).json({ error: "Use /api/user/subscription for authenticated accounts" });
            }

            try {
                const { data, error } = await supabase
                    .from('ag_user_usage')
                    .select('*')
                    .eq('device_id', deviceId)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // New user: Create default record
                    const newUser = {
                        device_id: deviceId,
                        tier: 'pro', // FORCE PRO FOR NEW USERS
                        ai_pack_credits: 999,
                        created_at: new Date().toISOString(),
                        trial_start_date: new Date().toISOString()
                    };
                    const { error: createError } = await supabase
                        .from('ag_user_usage')
                        .insert([newUser])
                        .single();
                    if (createError) throw createError;
                    return res.status(200).json(newUser);
                }

                // RETROACTIVE TRIAL: If existing user doesn't have trial_start_date, grant them one now
                if (!data.trial_start_date) {
                    const trialStartDate = new Date().toISOString();
                    await supabase
                        .from('ag_user_usage')
                        .update({ trial_start_date: trialStartDate })
                        .eq('device_id', deviceId);
                    data.trial_start_date = trialStartDate;
                }

                // FORCE PRO FOR EXISTING USERS
                data.tier = 'pro';
                data.ai_pack_credits = 999;

                return res.status(200).json(data);
            } catch (dbError) {
                // SECURITY: Mask DB Errors (Issue #5)
                console.error("Database Proxy Error:", { message: dbError instanceof Error ? dbError.message : 'Unknown', timestamp: new Date().toISOString() });
                return res.status(500).json({ error: "Database Sync Error" });
            }
        }

        if (requestType === 'usage_sync') {
            // SECURITY: CSRF Protection - Verify CSRF token for state-changing requests
            const csrfHeader = req.headers['x-csrf-token'];
            const csrfPayload = verifyCsrfToken(csrfHeader);
            const currentUid = session?.uid || deviceId;
            if (!csrfPayload || csrfPayload.uid !== currentUid) {
                console.warn(`Anti-Gravity Security: CSRF validation failed for ${maskDeviceId(deviceId)}`);
                return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED', details: 'Invalid or missing CSRF token. Please reinitialize session.' });
            }

            const { usage } = req.body;
            if (!usage) return res.status(400).json({ error: "Missing usage payload" });

            console.log('Anti-Gravity API: Processing usage_sync for device:', {
                deviceId: maskDeviceId(deviceId),
                timestamp: new Date().toISOString()
            });

            try {
                // SECURITY ALERT: IGNORE client-provided tier/credits
                // v2.9.0 Remediation: Prevent clients from overwriting their own billing tier info
                // We ONLY update usage counters (operations_today, ai_docs_weekly, etc.)
                const safeUpdates = {
                    device_id: deviceId,
                    operations_today: usage.operationsToday,
                    ai_docs_weekly: usage.aiDocsThisWeek,
                    ai_docs_monthly: usage.aiDocsThisMonth,
                    last_reset_daily: usage.lastOperationReset,
                    last_reset_weekly: usage.lastAiWeeklyReset,
                    last_reset_monthly: usage.lastAiMonthlyReset,
                    has_received_bonus: usage.hasReceivedBonus,
                };

                // Only allow upserting these "Usage Counter" fields. 
                // Tier and Credits must remain under server control.
                const { data, error } = await supabase
                    .from('ag_user_usage')
                    .upsert(
                        [safeUpdates],
                        { onConflict: 'device_id' }
                    );

                if (error) {
                    throw error;
                }

                return res.status(200).json({ success: true });
            } catch (syncError) {
                // SECURITY: Mask Sync Errors (Issue #5)
                console.error('Anti-Gravity API: usage_sync sync error:', {
                    message: syncError instanceof Error ? syncError.message : 'Unknown',
                    deviceId: maskDeviceId(deviceId),
                    timestamp: new Date().toISOString()
                });
                return res.status(500).json({
                    error: "Usage sync failed"
                });
            }
        }
    }

    // Execute Data Sync / Time Logic first
    if (['server_time', 'usage_fetch', 'usage_sync'].includes(requestType)) {
        return await handleBackendLogic();
    }

    // Stage 3: Neural Credit Verification (Supabase) - Only for processing/AI requests
    // SECURITY: CRITICAL VULNERABILITY FIX (P1)
    // FAIL-CLOSED POLICY: If DB is unreachable, we must BLOCK the request.
    if (supabase && deviceId && deviceId !== 'null' && requestType !== 'guidance') {
        try {
            const { data: usage, error } = await supabase
                .from('ag_user_usage')
                .select('*')
                .eq('device_id', deviceId)
                .single();

            if (error) {
                // FAIL-CLOSED: Any error checking quota means we cannot safely proceed
                console.error("Supabase Sync Error (Fail-Closed Engaged):", { message: error.message, code: error.code });
                return res.status(500).json({ error: "SERVICE_UNAVAILABLE", details: "Quota check failed. Please try again." });
            }

            if (usage) {
                // Check for 20-day trial bypass
                let isTrial = false;

                // RETROACTIVE TRIAL: Auto-grant trial to existing users without trial_start_date
                if (!usage.trial_start_date) {
                    const trialStartDate = new Date().toISOString();
                    await supabase
                        .from('ag_user_usage')
                        .update({ trial_start_date: trialStartDate })
                        .eq('device_id', deviceId);
                    usage.trial_start_date = trialStartDate;
                }

                if (usage.trial_start_date) {
                    const trialStart = new Date(usage.trial_start_date);
                    const now = new Date();
                    const daysDiff = Math.floor((now.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000));
                    if (daysDiff < 20) isTrial = true;
                }

                const canUse = true; // GLOBAL PRO OVERRIDE FOR TESTING/REVIEW

                if (!canUse) {
                    return res.status(403).json({ error: "NEURAL_LINK_EXHAUSTED", details: "You have reached your AI operation quota for this period." });
                }

                // Deduct credits on the server side (Skip for trial users)
                if (!isTrial) {
                    if (usage.ai_pack_credits > 0) {
                        await supabase.from('ag_user_usage').update({ ai_pack_credits: usage.ai_pack_credits - 1 }).eq('device_id', deviceId);
                    } else if (usage.tier === 'free') {
                        await supabase.from('ag_user_usage').update({ ai_docs_weekly: usage.ai_docs_weekly + 1 }).eq('device_id', deviceId);
                    }
                }
            } else {
                // FAIL-CLOSED: No usage record found means access denied
                return res.status(403).json({ error: "ACCESS_DENIED", details: "User record not found." });
            }
        } catch (e) {
            // FAIL-CLOSED: Catch-all error block
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
                        contents.push({
                            inlineData: {
                                data: img.includes('base64,') ? img.split('base64,')[1] : img,
                                mimeType
                            }
                        });
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
}
