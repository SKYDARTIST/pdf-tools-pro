import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Anti-Gravity Backend v2.0 - Secure Hybrid Architecture
const SYSTEM_INSTRUCTION = `You are the Anti-Gravity AI. Your goal is to help users understand complex documents. Use the provided CONTEXT or DOCUMENT TEXT as your primary source. Maintain a professional, technical tone.`;

// Supabase credentials - MUST be set in Vercel environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not configured. Usage tracking will be disabled.');
}

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Memory-safe model cache
let cachedModels = null;
let lastDiscovery = 0;

// RATE LIMITING (In-Memory for Warm Instances)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 10; // 10 reqs / min
const ipRequestCounts = new Map(); // Store: { count, startTime }

// Cleanup interval (every 5 mins) to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of ipRequestCounts.entries()) {
        if (now - data.startTime > RATE_LIMIT_WINDOW) {
            ipRequestCounts.delete(key);
        }
    }
}, 5 * 60 * 1000);

export default async function handler(req, res) {
    const origin = req.headers.origin;

    // CORS: Strict Whitelist (No trailing slashes)
    const ALLOWED_ORIGINS = [
        'capacitor://localhost',
        'http://localhost',
        'https://localhost',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://pdf-tools-pro.vercel.app',
        'https://pdf-tools-pro-indol.vercel.app'
    ];

    // Check for exact match
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        // CREDENTIALS DISABLED: We use JWTs in headers (Bearer), not Cookies.
        // Enabling credentials with reflected origin is a security risk (CSRF).
        // res.setHeader('Access-Control-Allow-Credentials', 'true'); 
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ag-signature, x-ag-device-id, x-ag-integrity-token');

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

    // GUIDANCE BYPASS: Skip all validation for guidance requests only
    const { type: requestType = '', usage = null } = req.body || {};
    const isGuidance = requestType === 'guidance';

    console.log('Anti-Gravity API: Incoming request:', {
        type: requestType,
        deviceId: deviceId?.substring(0, 8) + '...',
        hasSignature: !!signature,
        hasIntegrityToken: !!integrityToken,
        isGuidance,
        timestamp: new Date().toISOString()
    });

    // STAGE -1: Rate Limiting (early, before session validation)
    // Rate limit all requests to prevent abuse
    const rateLimitKey = deviceId || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const rateNow = Date.now();

    if (rateLimitKey) {
        const usageData = ipRequestCounts.get(rateLimitKey) || { count: 0, startTime: rateNow };

        // Reset window if expired
        if (rateNow - usageData.startTime > RATE_LIMIT_WINDOW) {
            usageData.count = 0;
            usageData.startTime = rateNow;
        }

        usageData.count++;
        ipRequestCounts.set(rateLimitKey, usageData);

        if (usageData.count > MAX_REQUESTS) {
            console.warn(`Anti-Gravity Security: Rate limit exceeded for ${maskDeviceId(rateLimitKey)}`);
            return res.status(429).json({ error: "Rate limit exceeded. Please try again in a minute." });
        }
    }

    // STAGE 0: Session Authentication & Integrity
    // --------------------------------------------------------------------------------
    const { createHmac } = await import('node:crypto');
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
        console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY environment variable is required for session token signing');
        return res.status(500).json({ error: 'Internal Server Error: Authentication not configured' });
    }

    // Helper: Generate Session Token (Stateless HMAC with enhanced validation fields)
    const generateSessionToken = (deviceId) => {
        const now = Date.now();
        const payload = JSON.stringify({
            uid: deviceId,
            iat: now,  // Issued at - for freshness validation
            exp: now + (60 * 60 * 1000), // 1 hour expiry
            scope: 'access',
            jti: Buffer.from(`${deviceId}-${now}-${Math.random()}`).toString('base64') // JWT ID - unique token identifier
        });
        const signature = createHmac('sha256', secret).update(payload).digest('hex');
        return Buffer.from(payload).toString('base64') + '.' + signature;
    };

    // Helper: Generate CSRF Token (prevents cross-site request forgery on POST endpoints)
    const generateCsrfToken = (deviceId) => {
        const now = Date.now();
        const randomBytes = Buffer.from(`${deviceId}-${now}-${Math.random()}`).toString('base64');
        const csrfPayload = JSON.stringify({
            csrf_jti: randomBytes,
            uid: deviceId,
            iat: now,
            exp: now + (60 * 60 * 1000) // 1 hour expiry
        });
        const csrfSignature = createHmac('sha256', secret).update(csrfPayload).digest('hex');
        return Buffer.from(csrfPayload).toString('base64') + '.' + csrfSignature;
    };

    // Helper: Verify Session Token with strict validation
    const verifySessionToken = (token) => {
        if (!token || typeof token !== 'string') return null;
        try {
            const [b64Payload, signature] = token.split('.');
            if (!b64Payload || !signature) return null;

            const payloadStr = Buffer.from(b64Payload, 'base64').toString();
            const expectedSignature = createHmac('sha256', secret).update(payloadStr).digest('hex');

            // Constant-time comparison to prevent timing attacks
            if (signature.length !== expectedSignature.length) return null;
            let signatureMatch = true;
            for (let i = 0; i < signature.length; i++) {
                if (signature[i] !== expectedSignature[i]) signatureMatch = false;
            }
            if (!signatureMatch) return null;

            const payload = JSON.parse(payloadStr);

            // Strict field validation
            if (!payload.uid || typeof payload.uid !== 'string') return null; // UID required
            if (!payload.exp || typeof payload.exp !== 'number') return null; // Exp required
            if (!payload.iat || typeof payload.iat !== 'number') return null; // IAT required
            if (!payload.jti || typeof payload.jti !== 'string') return null; // JTI required
            if (payload.scope !== 'access') return null; // Scope must be 'access'

            // Expiration check
            if (Date.now() > payload.exp) return null;

            // Token freshness check (not issued in the future by more than 5 seconds)
            if (payload.iat > Date.now() + 5000) return null;

            return payload;
        } catch (e) { return null; }
    };

    // Helper: Verify CSRF Token
    const verifyCsrfToken = (token) => {
        if (!token || typeof token !== 'string') return null;
        try {
            const [b64Payload, signature] = token.split('.');
            if (!b64Payload || !signature) return null;

            const payloadStr = Buffer.from(b64Payload, 'base64').toString();
            const expectedSignature = createHmac('sha256', secret).update(payloadStr).digest('hex');

            // Constant-time comparison
            if (signature.length !== expectedSignature.length) return null;
            let signatureMatch = true;
            for (let i = 0; i < signature.length; i++) {
                if (signature[i] !== expectedSignature[i]) signatureMatch = false;
            }
            if (!signatureMatch) return null;

            const payload = JSON.parse(payloadStr);

            // Strict field validation
            if (!payload.csrf_jti || typeof payload.csrf_jti !== 'string') return null;
            if (!payload.uid || typeof payload.uid !== 'string') return null;
            if (!payload.exp || typeof payload.exp !== 'number') return null;
            if (!payload.iat || typeof payload.iat !== 'number') return null;

            // Expiration check
            if (Date.now() > payload.exp) return null;

            return payload;
        } catch (e) { return null; }
    };

    // Handshake Endpoint: Exchange Integrity Token for Session Token
    if (requestType === 'session_init') {
        const expectedSignature = process.env.AG_PROTOCOL_SIGNATURE;

        // 1. Verify Protocol Signature
        if (!signature || signature !== expectedSignature) {
            return res.status(401).json({ error: 'UNAUTHORIZED_PROTOCOL' });
        }

        // 2. Verify Mock Integrity (Phase 6: Upgrade this to Google Play API)
        if (!integrityToken) {
            return res.status(401).json({ error: 'INTEGRITY_REQUIRED' });
        }

        // 3. Issue Session Token and CSRF Token
        const token = generateSessionToken(deviceId);
        const csrfToken = generateCsrfToken(deviceId);
        return res.status(200).json({ sessionToken: token, csrfToken: csrfToken });
    }

    if (!isGuidance) {
        // Enforce Session Token for all non-guidance requests (includes server_time)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const session = verifySessionToken(token);

        if (!session || session.uid !== deviceId) {
            console.warn(`Anti-Gravity Security: Blocked unauthenticated request from ${maskDeviceId(deviceId)}`);
            return res.status(401).json({ error: 'INVALID_SESSION', details: 'Session expired or invalid. Please restart app.' });
        }
    }

    // STAGE 1: Credential Verification
    // STRICT: Only use the backend secret. NEVER use VITE_ keys (which are public-facing)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Critical Failure: GEMINI_API_KEY is not configured in environment.");
        return res.status(500).json({ error: "Neural Link Offline", details: "API configuration missing." });
    }

    // Stage 1.5: Server Time Check (for frontend anti-manipulation)
    if (requestType === 'server_time') {
        return res.status(200).json({
            serverTime: new Date().toISOString()
        });
    }

    // Stage 2: Usage Data Operations (FETCH / SYNC)
    if (requestType === 'usage_fetch' || requestType === 'usage_sync') {
        if (!supabase) return res.status(503).json({ error: "Database Offline" });

        try {
            if (requestType === 'usage_fetch') {
                const { data, error } = await supabase
                    .from('ag_user_usage')
                    .select('*')
                    .eq('device_id', deviceId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (!data) {
                    // Initialize new user with free tier
                    const trialStartDate = new Date().toISOString();
                    const { data: newUser, error: createError } = await supabase
                        .from('ag_user_usage')
                        .insert([{
                            device_id: deviceId,
                            tier: 'free',
                            operations_today: 0,
                            ai_docs_weekly: 0,
                            ai_pack_credits: 0,
                            trial_start_date: trialStartDate
                        }])
                        .select()
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

                return res.status(200).json(data);
            }

            if (requestType === 'usage_sync') {
                // SECURITY: CSRF Protection - Verify CSRF token for state-changing requests
                const csrfHeader = req.headers['x-csrf-token'];
                const csrfPayload = verifyCsrfToken(csrfHeader);
                if (!csrfPayload || csrfPayload.uid !== deviceId) {
                    console.warn(`Anti-Gravity Security: CSRF validation failed for ${maskDeviceId(deviceId)}`);
                    return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED', details: 'Invalid or missing CSRF token. Please reinitialize session.' });
                }

                const { usage } = req.body;
                if (!usage) return res.status(400).json({ error: "Missing usage payload" });

                console.log('Anti-Gravity API: Processing usage_sync for device:', {
                    deviceId: maskDeviceId(deviceId),
                    tier: usage.tier,
                    timestamp: new Date().toISOString()
                });

                try {
                    const device_id_to_sync = deviceId;
                    // CRITICAL: Use upsert instead of update to handle new devices
                    // If device row doesn't exist, it will be created; otherwise, it will be updated
                    // Data must be an array for upsert to work properly
                    // STRICT: Do NOT trust the client for ai_pack_credits or tier.
                    // These are sensitive values that should only be modified by the server 
                    // (e.g., via purchase verification or initial trial grant).
                    const { data, error } = await supabase
                        .from('ag_user_usage')
                        .upsert(
                            [{
                                device_id: device_id_to_sync,
                                operations_today: usage.operationsToday,
                                ai_docs_weekly: usage.aiDocsThisWeek,
                                ai_docs_monthly: usage.aiDocsThisMonth,
                                last_reset_daily: usage.lastOperationReset,
                                last_reset_weekly: usage.lastAiWeeklyReset,
                                last_reset_monthly: usage.lastAiMonthlyReset,
                                has_received_bonus: usage.hasReceivedBonus,
                            }],
                            { onConflict: 'device_id' }
                        );

                    if (error) {
                        console.error('Anti-Gravity API: usage_sync upsert error:', {
                            message: error.message,
                            code: error.code,
                            status: error.status,
                            details: error.details,
                            hint: error.hint,
                            deviceId: maskDeviceId(deviceId),
                            timestamp: new Date().toISOString()
                        });
                        return res.status(400).json({
                            error: "Usage sync failed",
                            details: error.message,
                            code: error.code
                        });
                    }

                    console.log('Anti-Gravity API: ✅ usage_sync completed successfully for device:', {
                        deviceId,
                        aiPackCredits: usage.aiPackCredits,
                        timestamp: new Date().toISOString()
                    });

                    return res.status(200).json({ success: true });
                } catch (syncError) {
                    const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown error';
                    console.error('Anti-Gravity API: usage_sync sync error:', {
                        message: errorMsg,
                        deviceId: maskDeviceId(deviceId),
                        timestamp: new Date().toISOString()
                    });
                    return res.status(500).json({
                        error: "Database sync error",
                        details: errorMsg
                    });
                }
            }
        } catch (dbError) {
            const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
            console.error("Database Proxy Error:", { message: errorMsg, timestamp: new Date().toISOString() });
            return res.status(500).json({ error: "Database Sync Error", details: errorMsg });
        }
    }

    // Stage 3: Neural Credit Verification (Supabase) - Only for processing/AI requests
    if (supabase && deviceId && deviceId !== 'null' && requestType !== 'guidance') {
        try {
            const { data: usage, error } = await supabase
                .from('ag_user_usage')
                .select('*')
                .eq('device_id', deviceId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Supabase Sync Error:", { message: error.message, code: error.code, timestamp: new Date().toISOString() });
            } else if (usage) {
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

                const canUse = isTrial || usage.ai_pack_credits > 0 ||
                    (usage.tier === 'free' && usage.ai_docs_weekly < 1) ||
                    (usage.tier === 'pro' && usage.ai_docs_monthly < 10);

                if (!canUse) {
                    return res.status(403).json({ error: "NEURAL_LINK_EXHAUSTED", details: "You have reached your AI operation quota for this period." });
                }

                // Deduct credits on the server side (Skip for trial users)
                if (!isTrial && requestType !== 'usage_fetch' && requestType !== 'usage_sync') {
                    if (usage.ai_pack_credits > 0) {
                        await supabase.from('ag_user_usage').update({ ai_pack_credits: usage.ai_pack_credits - 1 }).eq('device_id', deviceId);
                    } else if (usage.tier === 'free') {
                        await supabase.from('ag_user_usage').update({ ai_docs_weekly: usage.ai_docs_weekly + 1 }).eq('device_id', deviceId);
                    }
                }
            }
        } catch (e) {
            console.warn("Usage check bypassed due to transient database sync issue.");
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
                    ]
                }, { apiVersion: 'v1beta' }); // Switched to v1beta for better image support

                let promptPayload = "";
                if (type === 'naming') {
                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nSuggest a professional filename for this document. NO extension, max 40 chars, underscores. CONTEXT: ${documentText || prompt}`;
                } else if (type === 'polisher') {
                    promptPayload = `${SYSTEM_INSTRUCTION}

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

**Examples:**
- Product photo → brightness: 95, contrast: 140, grayscale: 0
- Receipt → brightness: 90, contrast: 135, grayscale: 0
- Document → brightness: 95, contrast: 145, grayscale: 0
- Photo → brightness: 100, contrast: 130, grayscale: 0

**IMPORTANT: grayscale must ALWAYS be 0. Never suggest grayscale=100.**

Analyze the image and return ONLY the JSON object.`;
                } else if (type === 'audio_script') {
                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nCONVERT THE FOLLOWING DOCUMENT TEXT INTO A CONCISE, ENGAGING PODCAST-STYLE AUDIO SCRIPT.
                    
                    STRATEGIC INSTRUCTIONS:
                    ${prompt || "Generate a high-level strategic summary."}

                    RULES:
                    1. START DIRECTLY with the phrase: "Welcome to Anti-Gravity."
                    2. DO NOT use markdown symbols, stars, or formatting.
                    3. Keep it conversational.

                    DOCUMENT TEXT:
                    ${documentText || "No context provided."}`;
                } else if (type === 'table') {
                    // v2.0: Properly structure extraction prompts to prevent prompt leak
                    const extractionInstruction = prompt || `Extract all structured data from this document into JSON format. Output ONLY the raw JSON.`;
                    promptPayload = `${SYSTEM_INSTRUCTION}

EXTRACTION TASK:
${extractionInstruction}

DOCUMENT TO ANALYZE:
${documentText || "No text content - analyzing image only."}`;
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

                        promptPayload = `${SYSTEM_INSTRUCTION}\n\nClean and structure this web text into a professional document format. INPUT: ${textContent}\nFORMAT: Title then paragraphs. NO MARKDOWN.`;
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
                    promptPayload = `Generate a professional, high-quality image based on this request. ADHERE TO SAFETY POLICIES: NO VIOLENCE, NO NSFW, NO HATE. REQUEST: ${prompt}`;

                    // Specific model for visuals - include 2.0 standards
                    const allowedModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-image', 'imagen-3', 'gemini-1.5-flash'];
                    if (!allowedModels.includes(modelName)) {
                        continue;
                    }
                } else if (type === 'mindmap' || type === 'outline' || type === 'audio_script' || type === 'redact' || type === 'table') {
                    // DEBUG: Log what we're receiving
                    console.log('🔍 Backend DEBUG:', {
                        type,
                        hasImage: !!image,
                        imageLength: image ? (Array.isArray(image) ? image[0]?.length : image.length) : 0,
                        documentText: documentText,
                        documentTextType: typeof documentText,
                        documentTextLength: documentText?.length || 0,
                        willUseImageInstruction: !!(image && (!documentText || documentText.trim() === ''))
                    });

                    // For these types with images, use image-friendly system instruction
                    // Check for empty string or whitespace-only string
                    if (image && (!documentText || documentText.trim() === '')) {
                        // Image only - analyze the image directly
                        console.log('✅ Using IMAGE instruction');
                        const imageInstruction = `You are the Anti-Gravity AI. Your goal is to help users understand complex documents. Analyze the provided image to extract information and insights. Maintain a professional, technical tone.`;
                        promptPayload = `${imageInstruction}\n\n${prompt}`;
                    } else {
                        // Text or PDF - include document context
                        console.log('❌ Using TEXT instruction - documentText:', documentText);
                        promptPayload = `${SYSTEM_INSTRUCTION}\n\nQUERY: ${prompt}\n\nDOCUMENT CONTEXT:\n${documentText || "No context provided."}`;
                    }
                } else {
                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nQUERY: ${prompt}\n\nDOCUMENT CONTEXT:\n${documentText || "No context provided."}`;
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
