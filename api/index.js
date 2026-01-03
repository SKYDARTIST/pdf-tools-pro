
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// INITIALIZE GEMINI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

const SYSTEM_INSTRUCTION = `
You are the Anti-Gravity AI. 
Your goal is to help users understand complex PDF documents quickly.
Keep answers extremely concise, under 3 sentences.
Focus on extracting facts, explaining jargon, and summarizing content.
Do not speculate. If the text doesn't contain the answer, say so.
Maintain a professional, helpful, and technical tone.
`;

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', protocol: 'Anti-Gravity Secure Proxy' });
});

app.post('/api/ai/ask', async (req, res) => {
    const { prompt, documentText } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Server Configuration Error: Missing API Key" });
    }

    try {
        const modelsToTry = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-flash-lite-latest"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const promptPayload = `
                ${SYSTEM_INSTRUCTION}
                
                DOCUMENT_TEXT_PAYLOAD_START
                ${(documentText || '').substring(0, 15000)}
                DOCUMENT_TEXT_PAYLOAD_END

                PROTOCOL_QUERY: ${prompt}
                `;

                const result = await model.generateContent(promptPayload);
                const response = await result.response;
                return res.json({ text: response.text() });
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ Model ${modelName} failed. Routing...`);
            }
        }
        throw lastError;
    } catch (error) {
        console.error("CRITICAL AI KERNEL RESET:", error);
        res.status(500).json({ error: error.message || "AI Protocol Failure" });
    }
});

export default app;
