const aiCache = new Map<string, string>();

import AuthService from './authService';
import Config from './configService';
import { secureFetch } from './apiService';

export const askGemini = async (prompt: string, documentText?: string, type: 'chat' | 'naming' | 'table' | 'polisher' | 'scrape' | 'mindmap' | 'redact' | 'citation' | 'audio_script' | 'diff' | 'outline' | 'guidance' = 'chat', image?: string | string[], mimeType?: string): Promise<string> => {
  // Neuro-Caching Logic
  const cacheKey = `${type}:${prompt}:${documentText?.substring(0, 500)}:${image ? 'img' : 'no-img'}`;
  if (aiCache.has(cacheKey)) {
    console.log("⚡ Neuro-Cache Hit: Returning cached intelligence...");
    return aiCache.get(cacheKey)!;
  }

  try {
    // Always use production URL for Capacitor builds
    const backendUrl = `${Config.VITE_AG_API_URL}/api/index`;

    let response: Response;
    try {
      response = await secureFetch(backendUrl, {
        method: 'POST',
        body: JSON.stringify({ prompt, documentText: documentText || "", type, image, mimeType }),
      });
    } catch (fetchError: any) {
      throw new Error(`Network request failed: ${fetchError.message}`);
    }

    if (response.status === 429) {
      return "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds.";
    }

    if (response.status === 500) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === 'SERVICE_UNAVAILABLE') {
        return "BACKEND_ERROR: Neural Link Syncing. The system is balancing load, please try again in a moment.";
      }
      throw new Error(`Neural system failure (500). ${errorData.details || 'Synapse Overload Detected'}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || 'Proxy Processing Error';
      const details = errorData.details ? ` Details: ${errorData.details}` : '';
      throw new Error(`${msg}${details}`);
    }
    const data = await response.json();
    const result = data.text || "No response content.";

    // Store in cache if successful (do not cache errors or rate limits)
    const isError = result.startsWith('AI_ERROR') ||
      result.startsWith('BACKEND_ERROR') ||
      result.startsWith('AI_RATE_LIMIT');

    if (result && !isError) {
      aiCache.set(cacheKey, result);
    }

    return result;
  } catch (err: any) {
    const isRateLimit = err.message?.includes('AI_RATE_LIMIT') ||
      err.message?.includes('429') ||
      err.message?.toLowerCase().includes('quota exceeded');

    if (isRateLimit) {
      return "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds.";
    }

    // More descriptive error message for user
    const details = err.message || 'Security proxy is unreachable.';
    return `BACKEND_ERROR: ${details} (Access via secure edge protocol failed)`;
  }
};
