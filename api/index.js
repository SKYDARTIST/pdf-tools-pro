
import { GoogleGenerativeAI } from '@google/generative-ai';

// Anti-Gravity Backend v1.7 - Resilient Dynamic Protocol
export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API Key" });

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

        const { prompt, documentText, type, image, mimeType = 'image/jpeg' } = req.body;

        // 🏎️ PARALLEL EXECUTION: Fetch models and website at the same time to beat the Vercel clock
        const [modelsResponse, scrapeContent] = await Promise.all([
            fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
                .then(r => r.json())
                .catch(() => ({ models: [] })),
            type === 'scrape' ?
                fetch(prompt.trim().toLowerCase().startsWith('http') ? prompt.trim() : `https://${prompt.trim()}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                }).then(r => r.text()).catch((e) => `ERROR: ${e.message}`)
                : Promise.resolve("")
        ]);

        let modelsToTry = (modelsResponse.models || [])
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        if (modelsToTry.length === 0) modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];

        // Post-processing Content
        let textContent = "";
        if (type === 'scrape') {
            if (scrapeContent.startsWith('ERROR:')) return res.status(500).json({ error: `Connection Refused: ${scrapeContent}` });

            textContent = scrapeContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 7000);

            if (textContent.length < 20) return res.status(500).json({ error: "Target site blocked the capture or returned no text." });
        }

        const errors = [];
        // Sequential fallback loop as requested ("Lets Gemini decide")
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                let payload = "";

                if (type === 'scrape') {
                    payload = `Professional Transcriber: structure this text into a clean document. NO markdown. INPUT: ${textContent}`;
                } else if (type === 'naming') {
                    payload = `Suggest a professional filename (max 40 chars, underscores). CONTEXT: ${documentText || prompt}`;
                } else if (type === 'table') {
                    payload = `Extract tables into JSON: [{ "tableName": "Name", "headers": [], "rows": [[]] }]. ONLY JSON. SOURCE: ${documentText || prompt}`;
                } else {
                    payload = `QUERY: ${prompt}\nCONTEXT: ${documentText || ""}`;
                }

                const result = await model.generateContent([{ text: payload }, ...(image ? [{ inlineData: { data: image.includes('base64,') ? image.split('base64,')[1] : image, mimeType } }] : [])]);
                const response = await result.response;
                return res.status(200).json({ text: response.text() });
            } catch (err) {
                errors.push(`${modelName}: ${err.message.substring(0, 30)}`);
            }
        }

        return res.status(500).json({ error: "Neural Sync Failed.", details: errors.join(" | ") });
    } catch (error) {
        res.status(500).json({ error: "System Protocol Failure" });
    }
}
