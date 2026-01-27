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

export default async function handler(req, res) {
    const origin = req.headers.origin;

    // CORS: Allow specific origins. Local network IPs allowed only outside of production.
    const isLocalhost = origin && (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('capacitor://')
    );

    const isProduction = origin && (
        origin.includes('pdf-tools-pro.vercel.app')
    );

    const isLocalNetwork = origin && (
        origin.includes('192.168.') ||
        origin.includes('172.') ||
        origin.includes('10.')
    );

    // Only allow local network IPs if we are NOT in production
    const isDevEnv = process.env.VERCEL_ENV !== 'production';
    const allowedOrigin = isLocalhost || isProduction || (isDevEnv && isLocalNetwork);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
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

    // GUIDANCE BYPASS: Skip all validation for guidance or time checks
    const { type: requestType = '', usage = null } = req.body || {};
    const isGuidanceOrTime = requestType === 'guidance' || requestType === 'server_time';

    console.log('Anti-Gravity API: Incoming request:', {
        type: requestType,
        deviceId: deviceId?.substring(0, 8) + '...',
        hasSignature: !!signature,
        hasIntegrityToken: !!integrityToken,
        isGuidanceOrTime,
        timestamp: new Date().toISOString()
    });

    // STAGE 0: Session Authentication & Integrity
    // --------------------------------------------------------------------------------
    const { createHmac } = await import('node:crypto');
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'FALLBACK_SECRET_DO_NOT_USE_IN_PROD';

    // Helper: Generate Session Token (Stateless HMAC)
    const generateSessionToken = (deviceId) => {
        const payload = JSON.stringify({
            uid: deviceId,
            exp: Date.now() + (60 * 60 * 1000), // 1 hour expiry
            scope: 'access'
        });
        const signature = createHmac('sha256', secret).update(payload).digest('hex');
        return Buffer.from(payload).toString('base64') + '.' + signature;
    };

    // Helper: Verify Session Token
    const verifySessionToken = (token) => {
        if (!token) return null;
        try {
            const [b64Payload, signature] = token.split('.');
            if (!b64Payload || !signature) return null;

            const expectedSignature = createHmac('sha256', secret).update(Buffer.from(b64Payload, 'base64').toString()).digest('hex');
            if (signature !== expectedSignature) return null;

            const payload = JSON.parse(Buffer.from(b64Payload, 'base64').toString());
            if (Date.now() > payload.exp) return null; // Expired

            return payload;
        } catch (e) { return null; }
    };

    // Handshake Endpoint: Exchange Integrity Token for Session Token
    if (requestType === 'session_init') {
        const envSignature = process.env.AG_PROTOCOL_SIGNATURE;
        const expectedSignature = envSignature || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE';

        // 1. Verify Protocol Signature
        if (!signature || signature !== expectedSignature) {
            return res.status(401).json({ error: 'UNAUTHORIZED_PROTOCOL' });
        }

        // 2. Verify Mock Integrity (Phase 6: Upgrade this to Google Play API)
        if (!integrityToken) {
            return res.status(401).json({ error: 'INTEGRITY_REQUIRED' });
        }

        // 3. Issue Session Token
        const token = generateSessionToken(deviceId);
        return res.status(200).json({ sessionToken: token });
    }

    if (!isGuidanceOrTime) {
        // Enforce Session Token for all other requests
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const session = verifySessionToken(token);

        if (!session || session.uid !== deviceId) {
            // Fallback for transition period: If strict env var not set, allow old method?
            // NO. User requested "Fix ASAP". Strict enforcement.
            console.warn(`Anti-Gravity Security: Blocked unauthenticated request from ${deviceId}`);
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
                const { usage } = req.body;
                if (!usage) return res.status(400).json({ error: "Missing usage payload" });

                console.log('Anti-Gravity API: Processing usage_sync for device:', {
                    deviceId,
                    tier: usage.tier,
                    aiPackCredits: usage.aiPackCredits,
                    timestamp: new Date().toISOString()
                });

                try {
                    // CRITICAL: Use upsert instead of update to handle new devices
                    // If device row doesn't exist, it will be created; otherwise, it will be updated
                    // Data must be an array for upsert to work properly
                    const { data, error } = await supabase
                        .from('ag_user_usage')
                        .upsert(
                            [{
                                device_id: deviceId,
                                tier: usage.tier,
                                operations_today: usage.operationsToday,
                                ai_docs_weekly: usage.aiDocsThisWeek,
                                ai_docs_monthly: usage.aiDocsThisMonth,
                                ai_pack_credits: usage.aiPackCredits,
                                last_reset_daily: usage.lastOperationReset,
                                last_reset_weekly: usage.lastAiWeeklyReset,
                                last_reset_monthly: usage.lastAiMonthlyReset,
                                trial_start_date: usage.trialStartDate,
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
                            deviceId,
                            tier: usage.tier,
                            aiPackCredits: usage.aiPackCredits,
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
                    console.error('Anti-Gravity API: usage_sync sync error:', {
                        error: syncError.message,
                        stack: syncError.stack,
                        deviceId,
                        timestamp: new Date().toISOString()
                    });
                    return res.status(500).json({
                        error: "Database sync error",
                        details: syncError.message
                    });
                }
            }
        } catch (dbError) {
            console.error("Database Proxy Error:", dbError);
            return res.status(500).json({ error: "Database Sync Error", details: dbError.message });
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
                console.error("Supabase Sync Error:", error);
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
                    // Fetch inside the loop to allow model retries
                    const scrapeResponse = await fetch(prompt.trim());
                    const html = await scrapeResponse.text();
                    const textContent = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .substring(0, 10000);

                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nClean and structure this web text into a professional document format. INPUT: ${textContent}\nFORMAT: Title then paragraphs. NO MARKDOWN.`;
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
