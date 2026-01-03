
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.3 - Dynamic Discovery
export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // HEALTH CHECK / DIAGNOSTIC
    if (req.method === 'GET' && req.url.includes('/health')) {
        try {
            // Attempt to list models to see what this key can actually do
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            const modelNames = data.models ? data.models.map(m => m.name.replace('models/', '')) : [];

            return res.status(200).json({
                status: 'online',
                available_models: modelNames.slice(0, 10),
                note: "Neural Heartbeat active."
            });
        } catch (err) {
            return res.status(200).json({ status: 'online', discovery_error: err.message });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, documentText } = req.body;

    try {
        // We will try 1.5 Flash first as it's the most reliable for free tier
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro"
        ];

        const errors = [];

        for (const modelName of modelsToTry) {
            try {
                // IMPORTANT: Some environments prefer the full path models/modelname
                const model = genAI.getGenerativeModel({ model: modelName });
                const promptPayload = `
                You are the Anti-Gravity AI. Keep answers under 3 sentences.
                DOCUMENT: ${(documentText || '').substring(0, 15000)}
                QUERY: ${prompt}`;

                const result = await model.generateContent(promptPayload);
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
        res.status(500).json({ error: error.message || "AI Protocol Failure" });
    }
}
