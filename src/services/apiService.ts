import AuthService from './authService';
import Config from './configService';
import { getDeviceId } from './deviceService';
import { getIntegrityToken } from './integrityService';
import { getCsrfToken } from './csrfService';
import { HEADERS } from '@/utils/constants';
import { Logger } from '@/utils/logger';

/**
 * secureFetch
 * A wrapper around global fetch that automatically:
 * 1. Attaches all security headers (Signature, Integrity, DeviceID, CSRF, Auth)
 * 2. Detects 401 Unauthorized errors
 * 3. On 401: Clears the session, triggers a new handshake, and retries ONCE
 */
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Generate unique Request ID for tracking
    const requestId = Math.random().toString(36).substring(7).toUpperCase();
    const timestamp = new Date().toISOString();

    const performRequest = async (isRetry = false): Promise<Response> => {
        const deviceId = await getDeviceId();
        const integrityToken = await getIntegrityToken();
        const csrfToken = getCsrfToken();
        const authHeader = await AuthService.getAuthHeader();

        const headers = {
            ...options.headers,
            [HEADERS.CONTENT_TYPE]: 'application/json',
            [HEADERS.AUTHORIZATION]: authHeader,
            [HEADERS.SIGNATURE]: import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || '',
            'x-ag-timestamp': Date.now().toString(),
            [HEADERS.INTEGRITY_TOKEN]: integrityToken,
            [HEADERS.DEVICE_ID]: deviceId,
            [HEADERS.CSRF_TOKEN]: csrfToken || '',
            'X-Request-ID': requestId // Pass to backend for logging
        };

        console.log(`[${requestId}] 📤 Request:`, {
            url,
            method: options.method || 'GET',
            timestamp,
            isRetry
        });

        try {
            // SAFETY: Add 30-second timeout to prevent hanging on network issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(url, {
                    ...options,
                    headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                console.log(`[${requestId}] 📥 Response: ${response.status}`, {
                    statusText: response.statusText,
                    contentType: response.headers.get('content-type')
                });

                // P1 FIX: 401 UNAUTHORIZED -> Session is dead (with exponential backoff)
                if (response.status === 401) {
                    if (isRetry) {
                        Logger.error('API', `[${requestId}] Session refresh failed. User locked out. Manual re-auth required.`, { url });
                        return response;
                    }

                    console.warn(`[${requestId}] 🛡️ Unauthorized (401). Clearing session and refreshing...`);
                    AuthService.handleUnauthorized(); // Clear local state

                    // P1 FIX: Add exponential backoff (2 second delay) before retry
                    // This prevents hammering the server if handshake is slow
                    await new Promise(r => setTimeout(r, 2000));

                    console.log(`[${requestId}] 🔄 Retrying request after session refresh...`);
                    return performRequest(true);
                }

                return response;
            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // Check if it was a timeout
                if (fetchError.name === 'AbortError') {
                    console.error(`[${requestId}] ⏱️ Request timeout after 30 seconds`);
                    throw new Error('Request timeout - please check your network connection');
                }
                throw fetchError;
            }
        } catch (error: any) {
            console.error(`[${requestId}] 🚨 Network error:`, error.message);
            if (!isRetry) {
                // Add 1-second backoff before network error retry
                await new Promise(r => setTimeout(r, 1000));
                return performRequest(true);
            }
            throw error;
        }
    };

    return performRequest();
};
