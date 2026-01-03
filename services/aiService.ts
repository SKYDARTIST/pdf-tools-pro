
/**
 * ANTI-GRAVITY AI SERVICE
 * Dual-mode implementation for Play Store Compliance.
 */

export const askGemini = async (prompt: string, documentText?: string, type: 'chat' | 'naming' = 'chat'): Promise<string> => {
  // @ts-ignore - Vite env variables
  const localApiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  try {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/index' : '/api';

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, documentText: documentText || "", type }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || 'Proxy Processing Error';
      const details = errorData.details ? ` Details: ${errorData.details}` : '';
      throw new Error(`${msg}${details}`);
    }
    const data = await response.json();
    return data.text || "No response content.";
  } catch (err: any) {
    console.error("Backend Proxy Failure:", err);

    // Fallback to direct API key ONLY in local development
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (localApiKey && (isLocal && localApiKey !== 'PLACEHOLDER_API_KEY')) {
      console.log("🔄 falling back to direct API key (Dev Mode)...");
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const ai = new GoogleGenerativeAI(localApiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`Type: ${type}\nContext: ${documentText}\n\nQuestion: ${prompt}`);
        const resultText = await result.response;
        return resultText.text();
      } catch (error: any) {
        console.error("Direct API Error:", error);
        return `AI_ERROR: Direct connection failed. ${error.message}`;
      }
    }

    const details = err.message || 'Security proxy is unreachable.';
    return `BACKEND_ERROR: ${details} (If on Vercel, ensure GEMINI_API_KEY is set in settings)`;
  }
};
