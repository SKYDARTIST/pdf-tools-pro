import { UserSubscription, SubscriptionTier } from './subscriptionService';
import { getIntegrityToken } from './integrityService';

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

// Get or generate a unique ID for this device/browser
export const getDeviceId = (): string => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
};

export const fetchUserUsage = async (): Promise<UserSubscription | null> => {
    const deviceId = getDeviceId();
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

        if (!response.ok) throw new Error('Proxy Fetch Failed');
        const data = await response.json();

        if (data) {
            return {
                tier: data.tier as SubscriptionTier,
                operationsToday: data.operations_today,
                aiDocsThisWeek: data.ai_docs_weekly,
                aiDocsThisMonth: data.ai_docs_monthly,
                aiPackCredits: data.ai_pack_credits,
                lastOperationReset: data.last_reset_daily,
                lastAiWeeklyReset: data.last_reset_weekly,
                lastAiMonthlyReset: data.last_reset_monthly,
                trialStartDate: data.trial_start_date,
            };
        }
    } catch (error) {
        console.error('Error fetching usage via Proxy:', error);
    }
    return null;
};

export const syncUsageToServer = async (usage: UserSubscription): Promise<void> => {
    const deviceId = getDeviceId();
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
            body: JSON.stringify({ type: 'usage_sync', usage }),
        });

        if (!response.ok) throw new Error('Proxy Sync Failed');
    } catch (error) {
        console.error('Error syncing usage via Proxy:', error);
    }
};
