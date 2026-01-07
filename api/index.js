import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.5 - Optimized Architecture
const SYSTEM_INSTRUCTION = `You are the Anti-Gravity AI. Your goal is to help users understand complex documents. Use the provided CONTEXT or DOCUMENT TEXT as your primary source. Maintain a professional, technical tone.`;

// Memory-safe model cache
let cachedModels = null;
let lastDiscovery = 0;

export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
    }

    // Stage 1 Protocol Integrity Check
    const signature = req.headers['x-ag-signature'];
    if (signature !== 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE') {
        return res.status(401).json({ error: "Protocol Integrity Violation." });
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

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

                // v1.6: Dynamic Response Handling
                const text = response.text();

                // Refined Safety Check: Only block if it explicitly looks like a refusal
                const lowerText = text.toLowerCase();
                const representsRefusal = lowerText.includes("i can't help") || lowerText.includes("policy") || lowerText.includes("safety") || lowerText.includes("prohibited") || lowerText.includes("blocked");

                // Guard: If it's a long description (likely a real result) or doesn't look like a refusal, it's safe.
                if (representsRefusal && text.length < 200) {
                    return res.status(400).json({ error: "Safety Violation: Asset discarded by Neural Guard." });
                }

                return res.status(200).json({ text: text });

            } catch (err) {
                const isRateLimit = err.message?.includes('429') || err.message?.includes('Quota');
                if (isRateLimit) {
                    return res.status(429).json({ error: "AI_RATE_LIMIT", details: "Synapse cooling in progress." });
                }
                errors.push(`${modelName}: ${err.message}`);
            }
        }

        // v1.7: NEURAL SIMULATION FALLBACK for Visuals
        // If all AI models fail during the demo,        // v1.7: NEURAL_SIMULATION FALLBACK for Visuals
        if (type === 'visual') {
            console.log("🛡️ Neural Simulation engaged: Falling back to high-res simulation.");
            const query = prompt.split(' ').slice(0, 3).join(',');
            // Using a more reliable Unsplash source URL
            const simulatedUrl = `https://source.unsplash.com/featured/1024x1024?${encodeURIComponent(query)}`;
            return res.status(200).json({ text: simulatedUrl, note: "Neural Simulation active due to link instability." });
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
