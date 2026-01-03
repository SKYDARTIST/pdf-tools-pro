
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.4 - Fully Autonomous Model Selection
export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Dynamic Discovery Logic
    const getAvailableModels = async () => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (!data.models) return [];

            // Filter for models that support text generation
            return data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } catch (err) {
            console.error("Discovery Error:", err);
            return [];
        }
    };

    // Health Check
    if (req.method === 'GET' && req.url.includes('/health')) {
        const models = await getAvailableModels();
        return res.status(200).json({
            status: 'online',
            discovered_nuclei: models,
            note: "Neural Heartbeat active and scanning."
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, documentText, image, mimeType = 'image/jpeg' } = req.body;

    try {
        // Step 1: Get the actual list of models available to THIS key right now
        let modelsToTry = await getAvailableModels();

        // Step 2: Fallback to a hardcoded list if discovery fails
        if (modelsToTry.length === 0) {
            modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-lite"];
        }

        const errors = [];

        for (const modelName of modelsToTry) {
            try {
                // Skip embedding models or experimental ones if we have others
                if (modelName.includes('embedding') || (modelName.includes('vision') && modelsToTry.length > 1)) continue;

                const model = genAI.getGenerativeModel({ model: modelName });

                let promptPayload = "";
                if (req.body.type === 'naming') {
                    promptPayload = `
                    You are the Anti-Gravity Organizer. Read the document text and suggest a professional filename.
                    RULES: No extension, max 50 chars, use underscores for spaces, no special characters.
                    DOCUMENT: ${(documentText || '').substring(0, 5000)}
                    ONLY OUTPUT THE FILENAME. NO EXPLANATION.`;
                } else if (req.body.type === 'table') {
                    promptPayload = `
                    You are the Anti-Gravity Data Extractor. 
                    TASK: Extract all tables found in the document into a structured JSON array of objects.
                    FORMAT: [{ "tableName": "name", "headers": ["h1", "h2"], "rows": [["v1", "v2"]] }]
                    RULES: If multiple tables exist, include them all. If no tables exist, return an empty array [].
                    DOCUMENT: ${(documentText || '').substring(0, 10000)}
                    ONLY OUTPUT THE JSON. NO MARKDOWN, NO EXPLANATION.`;
                } else if (req.body.type === 'polisher') {
                    promptPayload = `
                    You are the Anti-Gravity Vision Polisher. 
                    TASK: Optimize this document scan for a "Magic Color" effect.
                    GOAL: Brighten the paper to pure white/high clarity, but PRESERVE colors in logos, photos, and highlights.
                    INPUT: Analyze the lighting and color composition.
                    RULES: Return numeric values for [brightness, contrast, grayscale, sharpness] (100 is neutral).
                    - Brightness/Contrast: Boost enough to make paper white but not wash out photos.
                    - Grayscale: ONLY use for actual B&W documents. For color documents, keep this LOW (0-20) to preserve ink colors.
                    - Sharpness: Boost to define text edges.
                    FORMAT: { "brightness": 120, "contrast": 140, "grayscale": 10, "sharpness": 130, "reason": "Whitened paper while preserving red masthead and photo colors." }
                    ONLY OUTPUT THE JSON. NO MARKDOWN.`;
                } else {
                    promptPayload = `
                    You are the Anti-Gravity AI. Keep answers under 3 sentences.
                    DOCUMENT: ${(documentText || '').substring(0, 15000)}
                    QUERY: ${prompt}`;
                }

                let contents = [{ text: promptPayload }];

                if (req.body.type === 'polisher' && image) {
                    contents.push({
                        inlineData: {
                            data: image.includes('base64,') ? image.split('base64,')[1] : image,
                            mimeType: mimeType
                        }
                    });
                }

                const result = await model.generateContent(contents);
                const response = await result.response;
                return res.status(200).json({ text: response.text() });
            } catch (err) {
                // Collect specific error for debugging
                const shortError = err.message.substring(0, 100);
                errors.push(`${modelName}: ${shortError}`);

                // If it's a 429 (Quota), we keep trying other models
                // If it's an API Key error, we might want to stop, but for now we continue
            }
        }

        return res.status(500).json({
            error: "Autonomous Sync Failed.",
            details: errors.join(" | "),
            advice: "Your key is active but all discovered models report quota limits or are unavailable. Ensure billing is enabled in AI Studio for higher limits."
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "AI Protocol Failure" });
    }
}
