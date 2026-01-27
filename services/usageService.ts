import { UserSubscription, SubscriptionTier } from './subscriptionService';
import { getIntegrityToken } from './integrityService';

import { Device } from '@capacitor/device';

const DEVICE_ID_KEY = 'ag_device_id';

const generateUUID = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) { }

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
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
};

export const fetchUserUsage = async (): Promise<UserSubscription | null> => {
    const deviceId = await getDeviceId();
    const integrityToken = await getIntegrityToken();

    try {
        const isCapacitor = !!(window as any).Capacitor;
        const isDevelopment = window.location.hostname === 'localhost' && !isCapacitor;
        const backendUrl = isDevelopment
            ? 'http://localhost:3000/api/index'
            : 'https://pdf-tools-pro-indol.vercel.app/api/index';

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ag-signature': import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE',
                'x-ag-device-id': deviceId,
                'x-ag-integrity-token': integrityToken
            },
            body: JSON.stringify({ type: 'usage_fetch' }),
        });

        if (!response.ok) {
            console.error('Anti-Gravity Billing: fetchUserUsage response not OK:', {
                status: response.status,
                statusText: response.statusText,
                deviceId
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
        console.error('Anti-Gravity Billing: fetchUserUsage failed:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId,
            timestamp: new Date().toISOString()
        });
    }
    return null;
};

export const syncUsageToServer = async (usage: UserSubscription): Promise<void> => {
    const deviceId = await getDeviceId();
    const integrityToken = await getIntegrityToken();

    try {
        const isCapacitor = !!(window as any).Capacitor;
        const isDevelopment = window.location.hostname === 'localhost' && !isCapacitor;
        const backendUrl = isDevelopment
            ? 'http://localhost:3000/api/index'
            : 'https://pdf-tools-pro-indol.vercel.app/api/index';

        const signature = import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE';

        console.log('Anti-Gravity Billing: Syncing usage to server...', {
            deviceId,
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
            hasIntegrityToken: !!integrityToken,
            hasSignature: !!signature,
            timestamp: new Date().toISOString()
        });

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ag-signature': signature,
                'x-ag-device-id': deviceId,
                'x-ag-integrity-token': integrityToken
            },
            body: JSON.stringify({ type: 'usage_sync', usage }),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            let errorDetails = {};
            try {
                errorDetails = JSON.parse(responseBody);
            } catch {
                errorDetails = { rawResponse: responseBody };
            }

            console.error('Anti-Gravity Billing: syncUsageToServer failed:', {
                status: response.status,
                statusText: response.statusText,
                errorDetails,
                aiPackCredits: usage.aiPackCredits,
                tier: usage.tier,
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log('Anti-Gravity Billing: ✅ Usage synced successfully', {
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Anti-Gravity Billing: syncUsageToServer network error:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId,
            timestamp: new Date().toISOString()
        });
    }
};
