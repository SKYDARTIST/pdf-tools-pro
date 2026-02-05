// PERFORMANCE: LRU Cache with size limit to prevent memory leaks
const MAX_CACHE_SIZE = 50;
const aiCache = new Map<string, string>();

const setCache = (key: string, value: string) => {
  // If cache is full and this is a new key, remove oldest entry
  if (aiCache.size >= MAX_CACHE_SIZE && !aiCache.has(key)) {
    const firstKey = aiCache.keys().next().value;
    aiCache.delete(firstKey);
  }
  aiCache.set(key, value);
};

import AuthService from './authService';
import Config from './configService';
import { secureFetch } from './apiService';

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export const askGemini = async (prompt: string, documentText?: string, type: 'chat' | 'naming' | 'table' | 'polisher' | 'scrape' | 'mindmap' | 'redact' | 'citation' | 'audio_script' | 'diff' | 'outline' | 'guidance' = 'chat', image?: string | string[], mimeType?: string): Promise<AIResponse> => {
  // Neuro-Caching Logic
  const cacheKey = `${type}:${prompt}:${documentText?.substring(0, 500)}:${image ? 'img' : 'no-img'}`;
  if (aiCache.has(cacheKey)) {
    console.log("⚡ Neuro-Cache Hit: Returning cached intelligence...");
    return {
      success: true,
      data: aiCache.get(cacheKey)!
    };
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
      return {
        success: false,
        error: "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds."
      };
    }

    if (response.status === 500) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === 'SERVICE_UNAVAILABLE') {
        return {
          success: false,
          error: "Server Error: The AI is currently busy. Please try again in a moment."
        };
      }
      throw new Error(`AI system failure (500). The AI is currently at maximum capacity.`);
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
    if (result) {
      setCache(cacheKey, result);
    }

    return {
      success: true,
      data: result
    };
  } catch (err: any) {
    const isRateLimit = err.message?.includes('AI_RATE_LIMIT') ||
      err.message?.includes('429') ||
      err.message?.toLowerCase().includes('quota exceeded');

    if (isRateLimit) {
      return {
        success: false,
        error: "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds."
      };
    }

    // More descriptive error message for user
    const details = err.message || 'Security proxy is unreachable.';
    return {
      success: false,
      error: `Server Connection Error: ${details}`
    };
  }
};
