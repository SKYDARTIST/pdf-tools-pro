
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.4 - Dynamic Model Discovery (Restored)
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
            if (!data.models) return ["gemini-1.5-flash", "gemini-1.5-pro"];

            return data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } catch (err) {
            console.error("Discovery Error:", err);
            return ["gemini-1.5-flash", "gemini-1.5-pro"];
        }
    };

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, documentText, type, image, mimeType = 'image/jpeg' } = req.body;

    try {
        // Step 1: Get the actual list of models available to THIS key right now
        let modelsToTry = await getAvailableModels();
        const errors = [];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });

                let promptPayload = "";
                if (type === 'naming') {
                    promptPayload = `Suggest a professional filename for this document. NO extension, max 40 chars, use underscores. CONTEXT: ${documentText || prompt}`;
                } else if (type === 'table') {
                    promptPayload = `Extract tables Found in the text or image into JSON: [{ "tableName": "Name", "headers": [], "rows": [[]] }]. ONLY JSON output.`;
                } else if (type === 'scrape') {
                    // Fetch as per "previous way" inside the loop
                    const scrapeResponse = await fetch(prompt.trim());
                    const html = await scrapeResponse.text();
                    const textContent = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .substring(0, 10000);

                    promptPayload = `Clean and structure this raw web text into a professional document format. INPUT: ${textContent}\nFORMAT: Title followed by structured paragraphs. NO MARKDOWN.`;
                } else {
                    promptPayload = `QUERY: ${prompt}\nCONTEXT: ${documentText || ""}`;
                }

                let contents = [{ text: promptPayload }];

                if (image) {
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
                errors.push(`${modelName}: ${err.message}`);
                // Continue to next model
            }
        }

        return res.status(500).json({
            error: "Neural Handshake Failed.",
            details: errors.join(" | ")
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "Protocol Failure" });
    }
}
