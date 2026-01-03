
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.5 - Optimized Resilience
export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Dynamic Discovery Logic - Kept as requested
    const getAvailableModels = async () => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (!data.models || data.models.length === 0) return ["gemini-1.5-flash", "gemini-1.5-pro"];

            return data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } catch (err) {
            return ["gemini-1.5-flash", "gemini-1.5-pro"];
        }
    };

    if (req.method === 'GET' && req.url.includes('/health')) {
        const models = await getAvailableModels();
        return res.status(200).json({ status: 'online', discovered_nuclei: models });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, documentText, image, mimeType = 'image/jpeg' } = req.body;

    try {
        let modelsToTry = await getAvailableModels();
        const errors = [];

        // PRE-FLIGHT: If scraping, fetch ONCE outside the loop to prevent timeouts
        let textContentForScrape = "";
        if (req.body.type === 'scrape') {
            try {
                const scrapeRes = await fetch(prompt.trim(), {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });
                if (!scrapeRes.ok) return res.status(500).json({ error: `Connection Refused: Status ${scrapeRes.status}` });

                const html = await scrapeRes.text();
                textContentForScrape = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmb, '')
                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmb, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 8000); // Optimized for speed

                if (textContentForScrape.length < 50) return res.status(500).json({ error: "Source site returned no readable content." });
            } catch (err) {
                return res.status(500).json({ error: `Scraping Failed: ${err.message}` });
            }
        }

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                let promptPayload = "";

                if (req.body.type === 'scrape') {
                    promptPayload = `Clean and structure this web text into a professional document. INPUT: ${textContentForScrape}\nFORMAT: Title then paragraphs. NO MARKDOWN.`;
                } else if (req.body.type === 'naming') {
                    promptPayload = `Suggest a professional filename for this document (max 40 chars, underscores). CONTEXT: ${documentText || prompt}.\nONLY OUTPUT FILENAME.`;
                } else if (req.body.type === 'table') {
                    promptPayload = `Extract tables from image/text into JSON: [{ "tableName": "Name", "headers": [], "rows": [[]] }]\nONLY JSON.`;
                } else {
                    promptPayload = `QUERY: ${prompt}\nCONTEXT: ${documentText || ""}`;
                }

                let contents = [{ text: promptPayload }];
                if (image) {
                    contents.push({ inlineData: { data: image.includes('base64,') ? image.split('base64,')[1] : image, mimeType } });
                }

                const result = await model.generateContent(contents);
                const response = await result.response;
                return res.status(200).json({ text: response.text() });
            } catch (err) {
                errors.push(`${modelName}: ${err.message.substring(0, 50)}`);
            }
        }

        return res.status(500).json({ error: "Synchronous Failure across nuclei.", details: errors.join(" | ") });
    } catch (error) {
        res.status(500).json({ error: error.message || "Protocol Failure" });
    }
}
