
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
                    You are the Anti-Gravity Organizer. Read the document text or analyze the image and suggest a professional filename.
                    RULES: No extension, max 40 chars, use underscores for spaces, no special characters.
                    CONTEXT: ${(documentText || '').substring(0, 3000)}
                    GOAL: Create a name like: Invoice_Amazon_Jan_2024 or Signed_Lease_Agreement.
                    ONLY OUTPUT THE FILENAME. NO EXPLANATION.`;
                } else if (req.body.type === 'table') {
                    promptPayload = `
                    You are the Anti-Gravity Data Extractor. 
                    TASK: Analyze the provided image or text and extract all tables found into a structured JSON array.
                    FORMAT: [{ "tableName": "Display Name", "headers": ["Header1", "Header2"], "rows": [["Row1Val1", "Row1Val2"]] }]
                    RULES: 
                    1. Reconstruct the table grid with extreme precision. 
                    2. If multiple tables exist, include them all as separate objects in the array. 
                    3. If no tables exist, return an empty array [].
                    ONLY OUTPUT THE JSON. NO MARKDOWN, NO EXPLANATION.`;
                } else if (req.body.type === 'polisher') {
                    promptPayload = `
                    You are the Anti-Gravity Vision Polisher. 
                    TASK: Optimize this document scan for a "Magic Color" effect with DETAIL PRESERVATION.
                    GOAL: Whiten the paper, but DO NOT wash out text, faces, or bright areas (Highlights).
                    INPUT: Analyze the lighting, text contrast, and existing bright spots.
                    RULES: Return numeric values for [brightness, contrast, grayscale, sharpness] (100 is neutral).
                    - Brightness: Be conservative (105-120). Do not "blow out" highlights or fade light-colored text.
                    - Contrast: Boost (120-140) to define text against the paper, but avoid crushing shadows in photos.
                    - Grayscale: Keep low (0-15) to preserve original ink and photo colors.
                    - Sharpness: Moderate boost (110-130) to define character edges.
                    PRIORITY: Readability and detail preservation over perfect paper whiteness.
                    FORMAT: { "brightness": 115, "contrast": 135, "grayscale": 5, "sharpness": 125, "reason": "Whitened background while protecting highlights on the photo and ensuring text isn't faded." }
                    ONLY OUTPUT THE JSON. NO MARKDOWN.`;
                } else {
                    promptPayload = `
                    You are the Anti-Gravity AI. Keep answers under 3 sentences.
                    DOCUMENT: ${(documentText || '').substring(0, 15000)}
                    QUERY: ${prompt}`;
                }

                let contents = [{ text: promptPayload }];

                if ((req.body.type === 'polisher' || req.body.type === 'table' || req.body.type === 'naming') && image) {
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
