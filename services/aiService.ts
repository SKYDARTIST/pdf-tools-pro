
/**
 * ANTI-GRAVITY AI SERVICE
 * Dual-mode implementation for Play Store Compliance.
 */

const aiCache = new Map<string, string>();

import { getDeviceId } from './usageService';
import { getIntegrityToken } from './integrityService';

export const askGemini = async (prompt: string, documentText?: string, type: 'chat' | 'naming' | 'table' | 'polisher' | 'scrape' | 'mindmap' | 'redact' | 'citation' | 'audio_script' | 'diff' | 'outline' = 'chat', image?: string | string[], mimeType?: string): Promise<string> => {
  // Neuro-Caching Logic
  const cacheKey = `${type}:${prompt}:${documentText?.substring(0, 500)}:${image ? 'img' : 'no-img'}`;
  if (aiCache.has(cacheKey)) {
    console.log("⚡ Neuro-Cache Hit: Returning cached intelligence...");
    return aiCache.get(cacheKey)!;
  }

  try {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/index' : '/api';
    const integrityToken = await getIntegrityToken();

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ag-signature': import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE',
        'x-ag-device-id': getDeviceId(),
        'x-ag-integrity-token': integrityToken
      },
      body: JSON.stringify({ prompt, documentText: documentText || "", type, image, mimeType }),
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

    // Store in cache if successful (do not cache errors or rate limits)
    const isError = result.startsWith('AI_ERROR') ||
      result.startsWith('BACKEND_ERROR') ||
      result.startsWith('AI_RATE_LIMIT');

    if (result && !isError) {
      aiCache.set(cacheKey, result);
    }

    return result;
  } catch (err: any) {
    console.error("Backend Proxy Failure:", err);

    const isRateLimit = err.message?.includes('AI_RATE_LIMIT') ||
      err.message?.includes('429') ||
      err.message?.toLowerCase().includes('quota exceeded');

    if (isRateLimit) {
      return "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds.";
    }

    const details = err.message || 'Security proxy is unreachable.';
    return `BACKEND_ERROR: ${details} (Access via secure edge protocol failed)`;
  }
};
