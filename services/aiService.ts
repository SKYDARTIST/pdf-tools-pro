
/**
 * ANTI-GRAVITY AI SERVICE
 * Dual-mode implementation for Play Store Compliance.
 */

export const askGemini = async (prompt: string, documentText: string) => {
  // @ts-ignore - Vite env variables
  const backendUrl = import.meta.env?.VITE_BACKEND_URL;
  // @ts-ignore
  const localApiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  // MODE 1: SECURE BACKEND PROXY (Production / Play Store)
  // Use VITE_BACKEND_URL if provided, otherwise default to relative path for unified deployment
  const apiUrl = backendUrl ? `${backendUrl}/api/ai/ask` : '/api/ai/ask';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, documentText })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Proxy Processing Error');
    }
    const data = await response.json();
    return data.text || "No response content.";
  } catch (err: any) {
    console.error("Backend Proxy Failure:", err);

    // Fallback to direct API key IF we are in development and proxy is failing
    if (localApiKey && localApiKey !== 'PLACEHOLDER_API_KEY') {
      console.log("🔄 falling back to direct API key...");
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const ai = new GoogleGenerativeAI(localApiKey);

      try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`Context: ${documentText}\n\nQuestion: ${prompt}`);
        return result.response.text();
      } catch (error: any) {
        console.error("Direct API Error:", error);
        if (error.message?.includes('SAFETY')) return "SAFETY_BLOCK: The response was filtered.";
        return `AI_ERROR: ${error.message || 'Direct connection failed.'}`;
      }
    }

    const details = err.message || 'Security proxy is unreachable.';
    return `BACKEND_ERROR: ${details}`;
  }
};
