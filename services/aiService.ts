
/**
 * ANTI-GRAVITY AI SERVICE
 * Dual-mode implementation for Play Store Compliance.
 */

const aiCache = new Map<string, string>();

import { getDeviceId } from './usageService';
import { getIntegrityToken } from './integrityService';

export const askGemini = async (prompt: string, documentText?: string, type: 'chat' | 'naming' | 'table' | 'polisher' | 'scrape' | 'mindmap' | 'redact' | 'citation' | 'audio_script' | 'diff' | 'outline' | 'guidance' = 'chat', image?: string | string[], mimeType?: string): Promise<string> => {
  // Neuro-Caching Logic
  const cacheKey = `${type}:${prompt}:${documentText?.substring(0, 500)}:${image ? 'img' : 'no-img'}`;
  if (aiCache.has(cacheKey)) {
    console.log("⚡ Neuro-Cache Hit: Returning cached intelligence...");
    return aiCache.get(cacheKey)!;
  }

  try {
    // ANDROID/CAPACITOR FIX: 
    // Capacitor serves the app from https://localhost/, but we need to use production API
    const isCapacitor = !!(window as any).Capacitor;
    const isDevelopment = window.location.hostname === 'localhost' && !isCapacitor;

    // Always use production URL for Capacitor builds
    const backendUrl = isDevelopment
      ? 'http://localhost:3000/api/index'
      : 'https://pdf-tools-pro-indol.vercel.app/api/index';

    console.log('🔍 Backend URL:', backendUrl, '| Capacitor:', isCapacitor, '| Dev:', isDevelopment);
    console.log('🔍 Request type:', type, '| Prompt length:', prompt?.length);

    const integrityToken = await getIntegrityToken();

    let response: Response;
    try {
      console.log('📡 Starting fetch request...');
      response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ag-signature': import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE',
          'x-ag-device-id': getDeviceId(),
          'x-ag-integrity-token': integrityToken
        },
        body: JSON.stringify({ prompt, documentText: documentText || "", type, image, mimeType }),
      });
      console.log('📡 Fetch completed, status:', response.status);
    } catch (fetchError: any) {
      console.error('📡 FETCH FAILED:', fetchError.name, fetchError.message);
      console.error('📡 Fetch error details:', JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
      throw new Error(`Network request failed: ${fetchError.message}`);
    }

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
    // Detailed error logging for debugging
    console.error("Backend Proxy Failure:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error cause:", err.cause);

    const isRateLimit = err.message?.includes('AI_RATE_LIMIT') ||
      err.message?.includes('429') ||
      err.message?.toLowerCase().includes('quota exceeded');

    if (isRateLimit) {
      return "AI_RATE_LIMIT: Synapse cooling in progress. Please wait 15-30 seconds.";
    }

    // More descriptive error message
    const details = err.message || 'Security proxy is unreachable.';
    return `BACKEND_ERROR: ${details} (Access via secure edge protocol failed)`;
  }
};
