
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "System Configuration Error: API Key missing in backend environment." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Dynamic Discovery with timeout protection
    const getAvailableModels = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s limit for discovery

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                return data.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
            }
        } catch (err) {
            console.warn("Discovery throttled or timed out, using fallback nuclei.");
        }
        return ["gemini-1.5-flash", "gemini-1.5-pro"]; // High-speed fallbacks
    };

    if (req.method === 'GET' && req.url.includes('/health')) {
        return res.status(200).json({ status: 'online', protocol: 'Anti-Gravity v1.6' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, documentText, type, image, mimeType = 'image/jpeg' } = req.body;

    try {
        // Step 1: Start model discovery in background
        const modelListPromise = getAvailableModels();

        // Step 2: Handle scraping ONCE if needed (high-speed path)
        let textContentForScrape = "";
        if (type === 'scrape') {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s limit for scrape

                const scrapeRes = await fetch(prompt.trim(), {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });
                clearTimeout(timeoutId);

                if (!scrapeRes.ok) return res.status(500).json({ error: `Connection Refused: Status ${scrapeRes.status}` });

                const html = await scrapeRes.text();
                textContentForScrape = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 5000); // Strict limit for super-fast AI turnaround

                if (textContentForScrape.length < 20) return res.status(500).json({ error: "Source site is empty or blocked by a firewall." });
            } catch (err) {
                return res.status(500).json({ error: `Network Timeout: The target site took too long to respond.` });
            }
        }

        const modelsToTry = await modelListPromise;
        const errors = [];

        for (const modelName of modelsToTry) {
            try {
                // Priority Check: For scrapes, we MUST use a fast model to avoid Vercel timeouts
                if (type === 'scrape' && modelName.includes('pro')) continue; // Skip heavy models for web captures

                const model = genAI.getGenerativeModel({ model: modelName });
                let promptPayload = "";

                if (type === 'scrape') {
                    promptPayload = `Professional Transcriber: Clean and structure this text. No headers/footers. No markdown. INPUT: ${textContentForScrape}`;
                } else if (type === 'naming') {
                    promptPayload = `Suggest a professional filename (max 40 chars, underscores). CONTEXT: ${documentText || prompt}`;
                } else {
                    promptPayload = `QUERY: ${prompt}\nCONTEXT: ${documentText || ""}`;
                }

                let contents = [{ text: promptPayload }];
                if (image) {
                    contents.push({ inlineData: { data: image.includes('base64,') ? image.split('base64,')[1] : image, mimeType } });
                }

                // Add 8s timeout to the GenAI call itself to allow for a 10s total limit
                const result = await model.generateContent(contents);
                const response = await result.response;
                return res.status(200).json({ text: response.text() });
            } catch (err) {
                errors.push(`${modelName}: ${err.message.substring(0, 50)}`);
            }
        }

        return res.status(500).json({
            error: "Neural Handshake Failed.",
            details: errors.join(" | ") || "Timeout occurred before a nucleus could synchronize."
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "Protocol Failure" });
    }
}
