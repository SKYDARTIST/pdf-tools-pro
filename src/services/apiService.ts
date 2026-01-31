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
            [HEADERS.SIGNATURE]: Config.VITE_AG_PROTOCOL_SIGNATURE,
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
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log(`[${requestId}] 📥 Response: ${response.status}`, {
                statusText: response.statusText,
                contentType: response.headers.get('content-type')
            });

            // 401 UNAUTHORIZED -> Session is dead
            if (response.status === 401) {
                if (isRetry) {
                    Logger.error('API', `[${requestId}] Handshake retry failed with 401 again. Giving up.`, { url });
                    return response;
                }

                console.warn(`[${requestId}] 🛡️ Unauthorized (401). Retrying with fresh session...`);
                AuthService.handleUnauthorized(); // Clear local state

                // Force a new handshake by getting header again
                return performRequest(true);
            }

            return response;
        } catch (error: any) {
            console.error(`[${requestId}] 🚨 Network error:`, error.message);
            if (!isRetry) {
                return performRequest(true);
            }
            throw error;
        }
    };

    return performRequest();
};
