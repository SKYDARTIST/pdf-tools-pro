
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;

// INITIALIZE GEMINI
const apiKey = process.env.GEMINI_API_KEY;
console.log(`🔑 API Key: ${apiKey ? 'LOADED' : 'MISSING'}`);
const genAI = new GoogleGenerativeAI(apiKey || '');

const SYSTEM_INSTRUCTION = `
You are the Anti-Gravity AI. 
Your goal is to help users understand complex PDF documents quickly.
Keep answers extremely concise, under 3 sentences.
Focus on extracting facts, explaining jargon, and summarizing content.
Do not speculate. If the text doesn't contain the answer, say so.
Maintain a professional, helpful, and technical tone.
`;

app.get('/health', (req, res) => {
    res.json({ status: 'online', protocol: 'Anti-Gravity Secure Proxy' });
});

app.get('/api/ai/models', async (req, res) => {
    try {
        const result = await genAI.listModels();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/ask', async (req, res) => {
    const { prompt, documentText } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Server Configuration Error: Missing API Key" });
    }

    try {
        // RESILIENT FALLBACK: Try several modern models in order of priority (Free Tier compatible)
        const modelsToTry = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-flash-lite-latest"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Attempting connection with: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const promptPayload = `
                ${SYSTEM_INSTRUCTION}
                
                DOCUMENT_TEXT_PAYLOAD_START
                ${documentText.substring(0, 15000)}
                DOCUMENT_TEXT_PAYLOAD_END

                PROTOCOL_QUERY: ${prompt}
                `;

                const result = await model.generateContent(promptPayload);
                const response = await result.response;
                return res.json({ text: response.text() });
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ Model ${modelName} failed or unauthorized. Routing to next...`);
            }
        }

        // If all fail, throw the last specific error
        throw lastError;
    } catch (error) {
        console.error("CRITICAL AI KERNEL RESET:", error);
        res.status(500).json({ error: error.message || "AI Protocol Failure" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Anti-Gravity Security Proxy active on 0.0.0.0:${PORT}`);
});
