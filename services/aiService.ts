
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
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/api/ai/ask`, {
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
      // More descriptive error for proxy failure
      const details = err.message || 'Security proxy is unreachable.';
      return `BACKEND_ERROR: ${details}`;
    }
  }

  // MODE 2: DIRECT CLIENT KEY (Development only)
  if (localApiKey && localApiKey !== 'PLACEHOLDER_API_KEY') {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const ai = new GoogleGenerativeAI(localApiKey);

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
      const result = await model.generateContent(`Context: ${documentText}\n\nQuestion: ${prompt}`);

      return result.response.text();
    } catch (error: any) {
      console.error("Direct API Error:", error);
      if (error.message?.includes('SAFETY')) return "SAFETY_BLOCK: The response was filtered.";
      return `AI_ERROR: ${error.message || 'Direct connection failed.'}`;
    }
  }

  return "CONFIGURATION_ERROR: No AI Backend or API Key found.";
};
