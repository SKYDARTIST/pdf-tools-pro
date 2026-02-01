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
            // trialStartDate: data.trial_start_date, // DEPRECATED
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
    try {
        const googleUser = await getCurrentUser();
        const deviceId = await getDeviceId();

        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;
        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        SecurityLogger.log('Anti-Gravity Billing: Syncing usage to server...', {
            user: googleUser ? googleUser.email : maskString(deviceId),
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
            timestamp: new Date().toISOString()
        });

        const secureUsage = {
            operationsToday: usage.operationsToday,
            lastOperationReset: usage.lastOperationReset,
        };

        const payload = googleUser ? secureUsage : { type: 'usage_sync', usage: secureUsage };

        const response = await secureFetch(backendUrl, {
            method: 'POST',
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

            // CHANGE: Add to retry queue instead of just logging
            addToRetryQueue(usage);
            notifyUserOfSyncFailure();
            return;
        }

        Logger.info('Billing', '✅ Usage synced successfully', {
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
        });

        // CHANGE: Clear from retry queue on success
        clearFromRetryQueue();

    } catch (error) {
        Logger.error('Billing', 'syncUsageToServer network error', {
            error: error instanceof Error ? error.message : String(error),
        });

        // CHANGE: Add to retry queue on network error
        addToRetryQueue(usage);
        notifyUserOfSyncFailure();
    }
};

const addToRetryQueue = (usage: UserSubscription): void => {
    try {
        const queue: FailedSync[] = JSON.parse(localStorage.getItem(FAILED_SYNCS_KEY) || '[]');

        // Check if already in queue
        const existing = queue.find(item => item.timestamp > Date.now() - 60000); // Last minute
        if (existing) {
            existing.attempts += 1;
        } else {
            queue.push({
                usage,
                timestamp: Date.now(),
                attempts: 1
            });
        }

        // Keep only last 10 failed syncs
        if (queue.length > 10) {
            queue.shift();
        }

        localStorage.setItem(FAILED_SYNCS_KEY, JSON.stringify(queue));
        console.warn('Anti-Gravity Sync: Added to retry queue');
    } catch (e) {
        console.error('Failed to add to retry queue:', e);
    }
};

const clearFromRetryQueue = (): void => {
    try {
        localStorage.removeItem(FAILED_SYNCS_KEY);
        console.log('Anti-Gravity Sync: Retry queue cleared');
    } catch (e) {
        console.error('Failed to clear retry queue:', e);
    }
};

const notifyUserOfSyncFailure = (): void => {
    window.dispatchEvent(new CustomEvent('sync-failed', {
        detail: { message: 'Changes will sync when online' }
    }));
};

export const retryFailedSyncs = async (): Promise<void> => {
    try {
        const queue: FailedSync[] = JSON.parse(localStorage.getItem(FAILED_SYNCS_KEY) || '[]');
        if (queue.length === 0) return;

        console.log(`Anti-Gravity Sync: Retrying ${queue.length} failed syncs...`);

        for (const item of queue) {
            // Skip if too old (7 days)
            if (Date.now() - item.timestamp > 7 * 24 * 60 * 60 * 1000) {
                console.warn('Skipping sync older than 7 days');
                continue;
            }

            // Skip if too many attempts
            if (item.attempts >= 5) {
                console.error('Max retry attempts exceeded');
                continue;
            }

            await syncUsageToServer(item.usage);
        }
    } catch (e) {
        console.error('Failed to retry syncs:', e);
    }
};

