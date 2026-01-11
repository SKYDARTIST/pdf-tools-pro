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

    // CORS: Allow all recognized origins (production, localhost, Capacitor, local network)
    // Since we verify requests via x-ag-signature, we can be permissive with CORS
    const allowedOrigin = origin && (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.') ||
        origin.includes('172.') ||
        origin.includes('10.') ||
        origin.includes('pdf-tools-pro') ||
        origin.includes('vercel.app') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://localhost')
    );

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ag-signature, x-ag-device-id, x-ag-integrity-token');

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

    // Get the request type from body (body is now guaranteed to be parsed for POST)
    const requestType = req.body?.type;

    // GUIDANCE BYPASS: Skip all validation for guidance requests (free for everyone)
    const isGuidanceRequest = requestType === 'guidance';

    if (!isGuidanceRequest) {
        // Protocol Integrity Check - signature must match environment variable
        const expectedSignature = process.env.AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE';

        if (signature !== expectedSignature) {
            return res.status(401).json({ error: 'UNAUTHORIZED_PROTOCOL', details: 'Neural link signature invalid or missing.' });
        }

        if (!deviceId) {
            return res.status(401).json({ error: 'MISSING_IDENTITY', details: 'Device identification payload is empty.' });
        }

        // Play Integrity Verification (Simulation)
        if (!integrityToken) {
            return res.status(401).json({ error: 'INTEGRITY_FAILURE', details: 'Play Integrity token missing. Session discarded.' });
        }

        try {
            const decoded = JSON.parse(Buffer.from(integrityToken, 'base64').toString());
            if (decoded.deviceId !== deviceId) {
                return res.status(401).json({ error: 'INTEGRITY_MISMATCH', details: 'Device ID does not match integrity payload.' });
            }
        } catch (e) {
            return res.status(401).json({ error: 'INTEGRITY_CORRUPTION', details: 'Integrity payload is malformed.' });
        }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
    }

    // Stage 2: Neural Credit Verification (Supabase)
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
                const canUse = usage.ai_pack_credits > 0 ||
                    (usage.tier === 'free' && usage.ai_docs_weekly < 1) ||
                    (usage.tier === 'pro' && usage.ai_docs_monthly < 10);

                if (!canUse) {
                    return res.status(403).json({ error: "NEURAL_LINK_EXHAUSTED", details: "You have reached your AI operation quota for this period." });
                }

                // Deduct credits on the server side
                if (usage.ai_pack_credits > 0) {
                    await supabase.from('ag_user_usage').update({ ai_pack_credits: usage.ai_pack_credits - 1 }).eq('device_id', deviceId);
                } else if (usage.tier === 'free') {
                    await supabase.from('ag_user_usage').update({ ai_docs_weekly: usage.ai_docs_weekly + 1 }).eq('device_id', deviceId);
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
        return ["gemini-2.0-flash", "gemini-1.5-flash"];
    };


    let { prompt, documentText, type, image, mimeType = 'image/jpeg' } = req.body;

    // QUOTA-SAFE TRUNCATION: Prevent massive documents from nuking the quota
    // Flash models handle 1M tokens, but daily/RPM limits are much tighter
    if (documentText && documentText.length > 30000) {
        console.log("🛡️ Neural Truncation engaged: Clipping context to 30,000 chars.");
        documentText = documentText.substring(0, 30000) + "... [REMAINDER OF OVERSIZED CARRIER TRUNCATED FOR STABILITY]";
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
                    const allowedModels = ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-2.5-flash-image', 'imagen-3', 'gemini-1.5-flash'];
                    if (!allowedModels.includes(modelName)) {
                        continue;
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
