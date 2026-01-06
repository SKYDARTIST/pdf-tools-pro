
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.4 - Dynamic Model Discovery (Full Revert)
const SYSTEM_INSTRUCTION = `You are the Anti-Gravity AI. Your goal is to help users understand complex documents. Use the provided CONTEXT or DOCUMENT TEXT as your primary source. If text is provided, analyze it thoroughly before responding. Maintain a professional, technical tone.`;

export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
    }

    // Stage 1 Protocol Integrity Check
    const signature = req.headers['x-ag-signature'];
    if (signature !== 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE') {
        console.warn("Unauthorized API Access Attempt Dropped");
        return res.status(401).json({ error: "Protocol Integrity Violation. Request Origin Untrusted." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Dynamic Discovery Logic - The "Gemini Decides" way
    const getAvailableModels = async () => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (!data.models) return ["gemini-2.0-flash", "gemini-1.5-flash"];

            return data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } catch (err) {
            console.error("Discovery Error:", err);
            return ["gemini-2.0-flash", "gemini-1.5-flash"];
        }
    };

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, documentText, type, image, mimeType = 'image/jpeg' } = req.body;

    try {
        let modelsToTry = await getAvailableModels();
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
                }, { apiVersion: 'v1' });

                let promptPayload = "";
                if (type === 'naming') {
                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nSuggest a professional filename for this document. NO extension, max 40 chars, underscores. CONTEXT: ${documentText || prompt}`;
                } else if (type === 'polisher') {
                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nAnalyze this scan for clarity. Suggest corrective filters in JSON format: { "brightness": number (80-150), "contrast": number (80-150), "grayscale": number (0 or 100), "sharpness": number (100-150), "reason": "string" }.\n\nCRITICAL: If the image has meaningful color (photographs, color text), set "grayscale" to 0. If it is a standard black and white document, set "grayscale" to 100 for better legibility.\n\nDOCUMENT TEXT (OCR SAMPLES):\n${documentText || "No document text available."}`;
                } else if (type === 'audio_script') {
                    promptPayload = `${SYSTEM_INSTRUCTION}\n\nCONVERT THE FOLLOWING DOCUMENT TEXT INTO A CONCISE, ENGAGING PODCAST-STYLE AUDIO SCRIPT. \n\nRULES:\n1. START DIRECTLY with the phrase: "Welcome to Anti-Gravity."\n2. DO NOT use any markdown symbols like asterisks (**), hashes (#), or bullet points.\n3. Keep the tone conversational and professional.\n\nDOCUMENT TEXT:\n${documentText || "No document text available."}`;
                } else if (type === 'table') {
                    promptPayload = `Extract tables from image/text into JSON: [{ "tableName": "Name", "headers": [], "rows": [[]] }]\nONLY JSON.`;
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
                return res.status(200).json({ text: response.text() });
            } catch (err) {
                errors.push(`${modelName}: ${err.message}`);
            }
        }

        return res.status(500).json({
            error: "Neural Sync Failed.",
            details: errors.join(" | ")
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "Protocol Failure" });
    }
}
