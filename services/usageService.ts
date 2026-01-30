import { UserSubscription } from './subscriptionService';
import AuthService from './authService';
import Config from './configService';
import { SecurityLogger, maskString } from '../utils/securityUtils';
import { API_ENDPOINTS } from '../utils/constants';
import { Logger } from '../utils/logger';
import { getDeviceId } from './deviceService';
import { getCurrentUser } from './googleAuthService';
import { secureFetch } from './apiService';


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
    try {
        const googleUser = await getCurrentUser();
        const deviceId = await getDeviceId();

        // Use the new Unified API endpoint if possible, or fallback to index
        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;
        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        SecurityLogger.log('Anti-Gravity Billing: Syncing usage to server...', {
            user: googleUser ? googleUser.email : maskString(deviceId),
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
            timestamp: new Date().toISOString()
        });

        // Payload Key Fix: new API expects flat object, old API expects { type, usage }
        // We will adapt payload based on endpoint
        const payload = googleUser ? usage : { type: 'usage_sync', usage };

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
