import { UserSubscription } from './subscriptionService';
import AuthService from './authService';
import Config from './configService';
import { SecurityLogger, maskString } from '@/utils/securityUtils';
import { API_ENDPOINTS } from '@/utils/constants';
import { Logger } from '@/utils/logger';
import { getDeviceId } from './deviceService';
import { getCurrentUser } from './googleAuthService';
import { secureFetch } from './apiService';

const FAILED_SYNCS_KEY = 'ag_failed_syncs';

interface FailedSync {
    usage: UserSubscription;
    timestamp: number;
    attempts: number;
}

// SAFETY: Parse localStorage with corruption protection
const safeParseFailedSyncs = (key: string): FailedSync[] => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : [];
    } catch (e) {
        console.error(`Anti-Gravity Usage: Corrupted data in ${key}, clearing and resetting.`, e);
        localStorage.removeItem(key);
        return [];
    }
};

/**
 * Usage Service - Simplified (2-Tier System)
 * 
 * NO usage tracking, NO counters.
 * Just tier syncing.
 */

export const fetchUserUsage = async (): Promise<UserSubscription | null> => {
    try {
        const googleUser = await getCurrentUser();
        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;
        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        const response = await secureFetch(backendUrl, {
            method: googleUser ? 'GET' : 'POST',
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

        // SAFETY: Validate response before accessing properties
        if (!data || typeof data !== 'object') {
            Logger.error('Billing', 'fetchUserUsage invalid response format', { data });
            return null;
        }

        // ONLY map the tier (counters removed from DB)
        const subscription: UserSubscription = {
            tier: data.tier
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
    try {
        const googleUser = await getCurrentUser();
        const deviceId = await getDeviceId();

        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;
        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        SecurityLogger.log('Anti-Gravity Billing: Syncing tier to server...', {
            user: googleUser ? googleUser.email : maskString(deviceId),
            tier: usage.tier,
            timestamp: new Date().toISOString()
        });

        // ONLY sync the tier
        const secureUsage = {
            tier: usage.tier
        };

        const payload = googleUser ? secureUsage : { type: 'usage_sync', usage: secureUsage };

        const response = await secureFetch(backendUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            Logger.error('Billing', 'syncUsageToServer failed', {
                status: response.status,
                tier: usage.tier,
            });

            addToRetryQueue(usage);
            return;
        }

        Logger.info('Billing', '✅ Tier synced successfully', {
            tier: usage.tier,
        });

        clearFromRetryQueue();

    } catch (error) {
        Logger.error('Billing', 'syncUsageToServer network error', {
            error: error instanceof Error ? error.message : String(error),
        });

        addToRetryQueue(usage);
    }
};

const addToRetryQueue = (usage: UserSubscription): void => {
    try {
        const queue: FailedSync[] = safeParseFailedSyncs(FAILED_SYNCS_KEY);
        queue.push({
            usage,
            timestamp: Date.now(),
            attempts: 1
        });

        if (queue.length > 5) queue.shift();
        localStorage.setItem(FAILED_SYNCS_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Failed to add to retry queue:', e);
    }
};

const clearFromRetryQueue = (): void => {
    localStorage.removeItem(FAILED_SYNCS_KEY);
};

export const retryFailedSyncs = async (): Promise<void> => {
    try {
        const queue: FailedSync[] = safeParseFailedSyncs(FAILED_SYNCS_KEY);
        if (queue.length === 0) return;

        for (const item of queue) {
            await syncUsageToServer(item.usage);
        }
    } catch (e) {
        console.error('Failed to retry syncs:', e);
    }
};

