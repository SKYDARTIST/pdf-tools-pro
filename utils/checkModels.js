import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function listModels() {
    if (!apiKey) {
        console.error("No API key found.");
        return;
    }
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("AVAILABLE MODELS (v1beta):", JSON.stringify(data, null, 2));

        const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const dataV1 = await responseV1.json();
        console.log("\nAVAILABLE MODELS (v1):", JSON.stringify(dataV1, null, 2));
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
