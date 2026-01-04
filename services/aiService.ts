
/**
 * ANTI-GRAVITY AI SERVICE
 * Dual-mode implementation for Play Store Compliance.
 */

const aiCache = new Map<string, string>();

export const askGemini = async (prompt: string, documentText?: string, type: 'chat' | 'naming' | 'table' | 'polisher' | 'scrape' | 'mindmap' | 'redact' | 'citation' | 'audio_script' | 'diff' = 'chat', image?: string | string[]): Promise<string> => {
  // @ts-ignore - Vite env variables
  const localApiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  // Neuro-Caching Logic
  const cacheKey = `${type}:${prompt}:${documentText?.substring(0, 500)}:${image ? 'img' : 'no-img'}`;
  if (aiCache.has(cacheKey)) {
    console.log("⚡ Neuro-Cache Hit: Returning cached intelligence...");
    return aiCache.get(cacheKey)!;
  }

  try {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/index' : '/api';

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, documentText: documentText || "", type, image }),
    });

    if (response.status === 429) {
      return "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds.";
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || 'Proxy Processing Error';
      const details = errorData.details ? ` Details: ${errorData.details}` : '';
      throw new Error(`${msg}${details}`);
    }
    const data = await response.json();
    const result = data.text || "No response content.";

    // Store in cache if successful
    if (result && !result.startsWith('AI_ERROR') && !result.startsWith('BACKEND_ERROR')) {
      aiCache.set(cacheKey, result);
    }

    return result;
  } catch (err: any) {
    console.error("Backend Proxy Failure:", err);

    // Fallback to direct API key ONLY in local development
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (localApiKey && (isLocal && localApiKey !== 'PLACEHOLDER_API_KEY')) {
      console.log("🔄 falling back to direct API key (Dev Mode)...");
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const ai = new GoogleGenerativeAI(localApiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1' });

        let contents: any[] = [`Type: ${type}\nContext: ${documentText}\n\nQuestion: ${prompt}`];
        if (image) {
          const images = Array.isArray(image) ? image : [image];
          images.forEach(img => {
            contents.push({
              inlineData: {
                data: img.includes('base64,') ? img.split('base64,')[1] : img,
                mimeType: 'image/jpeg'
              }
            });
          });
        }

        const result = await model.generateContent(contents);
        const resultResponse = await result.response;
        const resultText = resultResponse.text();

        // Cache dev fallback too
        aiCache.set(cacheKey, resultText);

        return resultText;
      } catch (error: any) {
        console.error("Direct API Error:", error);
        if (error.message?.includes('429')) return "AI_RATE_LIMIT: Synapse cooling in progress.";
        return `AI_ERROR: Direct connection failed. ${error.message}`;
      }
    }

    const details = err.message || 'Security proxy is unreachable.';
    return `BACKEND_ERROR: ${details} (If on Vercel, ensure GEMINI_API_KEY is set in settings)`;
  }
};
