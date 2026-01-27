import { UserSubscription } from './subscriptionService';
import { getIntegrityToken } from './integrityService';
import AuthService from './authService';
import Config from './configService';
import { SecurityLogger, maskString } from '../utils/securityUtils';
import { getCsrfToken } from './csrfService';
import { STORAGE_KEYS, HEADERS, API_ENDPOINTS } from '../utils/constants';
import { Logger } from '../utils/logger';

import { Device } from '@capacitor/device';

const generateUUID = () => {
    try {
        if (typeof crypto !== 'undefined') {
            if (crypto.randomUUID) {
                return crypto.randomUUID();
            }
            if (crypto.getRandomValues) {
                const buff = new Uint8Array(16);
                crypto.getRandomValues(buff);
                buff[6] = (buff[6] & 0x0f) | 0x40; // Version 4
                buff[8] = (buff[8] & 0x3f) | 0x80; // Variant 10
                return [...buff].map((b, i) => {
                    const hex = b.toString(16).padStart(2, '0');
                    if (i === 4 || i === 6 || i === 8 || i === 10) return '-' + hex;
                    return hex;
                }).join('');
            }
        }
    } catch (e) { }

    // Extreme fallback (only if crypto API is completely missing)
    Logger.warn('Security', 'Crypto API missing, using insecure fallback');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Get or generate a persistent ID for this device
export const getDeviceId = async (): Promise<string> => {
    try {
        // Try to get hardware ID first (Android/iOS)
        const info = await Device.getId();
        if (info && info.identifier) {
            return info.identifier;
        }
    } catch (e) {
        // Fallback for web or if plugin fails
    }

    // Fallback: localStorage
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
};

export const fetchUserUsage = async (): Promise<UserSubscription | null> => {
    const deviceId = await getDeviceId();
    const integrityToken = await getIntegrityToken();

    try {
        const { getCurrentUser } = await import('./googleAuthService');
        const googleUser = await getCurrentUser();

        // AUTH STRATEGY: Prefer Google Auth, fallback to Device ID
        const authHeader = await AuthService.getAuthHeader();
        const headers: any = {
            [HEADERS.CONTENT_TYPE]: 'application/json',
            [HEADERS.AUTHORIZATION]: authHeader,
            [HEADERS.SIGNATURE]: Config.VITE_AG_PROTOCOL_SIGNATURE,
            [HEADERS.INTEGRITY_TOKEN]: integrityToken
        };

        if (!googleUser) {
            headers[HEADERS.DEVICE_ID] = deviceId;
        }

        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;
        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        const response = await fetch(backendUrl, {
            method: googleUser ? 'GET' : 'POST',
            headers: headers,
            body: googleUser ? undefined : JSON.stringify({ type: 'usage_fetch' }),
        });

        if (!response.ok) {
            Logger.error('Billing', 'fetchUserUsage response not OK', {
                status: response.status,
                statusText: response.statusText
            });
            return null;
        }

        const data = await response.json();

        // Map snake_case response from Supabase to camelCase UserSubscription
        const subscription: UserSubscription = {
            tier: data.tier,
            operationsToday: data.operations_today || 0,
            aiDocsThisWeek: data.ai_docs_weekly || 0,
            aiDocsThisMonth: data.ai_docs_monthly || 0,
            aiPackCredits: data.ai_pack_credits || 0,
            lastOperationReset: data.last_reset_daily || new Date().toISOString(),
            lastAiWeeklyReset: data.last_reset_weekly || new Date().toISOString(),
            lastAiMonthlyReset: data.last_reset_monthly || new Date().toISOString(),
            trialStartDate: data.trial_start_date,
            hasReceivedBonus: data.has_received_bonus || false,
            purchaseToken: undefined // Not persisted in this table
        };

        return subscription;
    } catch (error) {
        Logger.error('Billing', 'fetchUserUsage failed', {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
    return null;
};

export const syncUsageToServer = async (usage: UserSubscription): Promise<void> => {
    const deviceId = await getDeviceId();
    const integrityToken = await getIntegrityToken();

    try {
        const { getCurrentUser } = await import('./googleAuthService');
        const googleUser = await getCurrentUser();

        // Use the new Unified API endpoint if possible, or fallback to index
        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;

        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        const signature = Config.VITE_AG_PROTOCOL_SIGNATURE;

        // AUTH STRATEGY
        const headers: any = {
            [HEADERS.CONTENT_TYPE]: 'application/json',
            [HEADERS.AUTHORIZATION]: await AuthService.getAuthHeader(),
            [HEADERS.SIGNATURE]: signature,
            [HEADERS.INTEGRITY_TOKEN]: integrityToken
        };

        if (!googleUser) {
            headers[HEADERS.DEVICE_ID] = deviceId;
            // SECURITY: Add CSRF token for state-changing requests (usage_sync)
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                headers[HEADERS.CSRF_TOKEN] = csrfToken;
            }
        }

        SecurityLogger.log('Anti-Gravity Billing: Syncing usage to server...', {
            user: googleUser ? googleUser.email : maskString(deviceId),
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
            timestamp: new Date().toISOString()
        });

        // Payload Key Fix: new API expects flat object, old API expects { type, usage }
        // We will adapt payload based on endpoint
        const payload = googleUser ? usage : { type: 'usage_sync', usage };

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            let errorDetails = {};
            try {
                errorDetails = JSON.parse(responseBody);
            } catch {
                errorDetails = { rawResponse: responseBody };
            }

            Logger.error('Billing', 'syncUsageToServer failed', {
                status: response.status,
                statusText: response.statusText,
                errorDetails,
                aiPackCredits: usage.aiPackCredits,
                tier: usage.tier,
            });
            return;
        }

        Logger.info('Billing', '✅ Usage synced successfully', {
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
        });
    } catch (error) {
        Logger.error('Billing', 'syncUsageToServer network error', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
