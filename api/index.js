
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.2 - Stable Production
export default async function handler(req, res) {
    if (req.method === 'GET' && req.url.includes('/health')) {
        return res.status(200).json({ status: 'online', mode: 'Serverless Function' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, documentText } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Server Configuration Error: Missing API Key" });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Stable Model Chain
        const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const promptPayload = `
                You are the Anti-Gravity AI. Keep answers under 3 sentences.
                DOCUMENT: ${(documentText || '').substring(0, 15000)}
                QUERY: ${prompt}`;

                const result = await model.generateContent(promptPayload);
                const response = await result.response;
                return res.status(200).json({ text: response.text() });
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    } catch (error) {
        console.error("AI PROTOCOL ERROR:", error);
        res.status(500).json({ error: error.message || "AI Protocol Failure" });
    }
}
