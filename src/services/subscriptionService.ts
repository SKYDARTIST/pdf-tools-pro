import { fetchUserUsage, syncUsageToServer } from './usageService';
import TaskLimitManager from '@/utils/TaskLimitManager';
import { SecurityLogger } from '@/utils/securityUtils';

import { STORAGE_KEYS, SUBSCRIPTION_TIERS, DEFAULTS } from '@/utils/constants';
import AuthService from './authService';
import Config from './configService';
import { secureFetch } from './apiService';

/**
 * Subscription Service - Simplified (2-Tier System)
 * 
 * NO counters, NO limits, NO sync complexity.
 * Everything is tier-based:
 * - FREE: Unlimited PDF tools, No AI docs.
 * - LIFETIME: Unlimited PDF tools, Unlimited AI docs.
 */

export enum SubscriptionTier {
    FREE = 'free',
    LIFETIME = 'lifetime',
    // Legacy support for migration
    PRO = 'pro',
    PREMIUM = 'premium'
}

export enum AiOperationType {
    HEAVY = 'heavy',
    GUIDANCE = 'guidance'
}

export enum AiBlockMode {
    BUY_PRO = 'buy_pro', // Effectively "Buy Lifetime" now
    NONE = 'none'
}

export interface UserSubscription {
    tier: SubscriptionTier;
    purchaseToken?: string;
}

const STORAGE_KEY = STORAGE_KEYS.SUBSCRIPTION;
let isHydrated = false;

// Initialize subscription from Supabase or localStorage
export const initSubscription = async (user?: any): Promise<UserSubscription> => {
    // Run drift reconciliation in the background - don't block boot
    reconcileSubscriptionDrift().catch(e => console.warn('Background drift sync failed:', e));

    // Force reconcile with a hard timeout to prevent hanging the app boot
    // If it fails or times out, we'll just use the cached version from getSubscription()
    try {
        const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Sync Timeout')), 2500)
        );

        const syncPromise = forceReconcileFromServer();

        return await Promise.race([syncPromise, timeoutPromise]) as UserSubscription;
    } catch (e) {
        console.warn('Anti-Gravity Subscription: Initial sync failed produced fallback:', e);
        return getSubscription();
    }
};

/**
 * Authoritatively syncs local tier with backend user_accounts table
 */
export const reconcileSubscriptionDrift = async (): Promise<void> => {
    try {
        const googleUid = localStorage.getItem(STORAGE_KEYS.GOOGLE_UID);
        if (!googleUid) return;

        const response = await secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
            method: 'POST',
            body: JSON.stringify({ type: 'check_subscription_status' })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.tier) {
                const sub = getSubscription();
                if (sub.tier !== data.tier) {
                    console.log(`🛡️ Drift Reconciliation: Updating local tier ${sub.tier} -> ${data.tier}`);
                    upgradeTier(data.tier as SubscriptionTier, undefined);
                }
            }
        }
    } catch (e) {
        console.error('Subscription drift reconciliation failed:', e);
    }
};

// Force fetch from server and update local state
export const forceReconcileFromServer = async (): Promise<UserSubscription> => {
    try {
        console.log('Anti-Gravity Subscription: 🔄 Forcing server reconciliation...');
        const supabaseUsage = await fetchUserUsage();
        if (supabaseUsage) {
            SecurityLogger.log('Anti-Gravity Subscription: ✅ Synchronized with Supabase');

            // Normalize legacy tiers to Lifetime if needed
            if (supabaseUsage.tier === SubscriptionTier.PRO || supabaseUsage.tier === SubscriptionTier.PREMIUM) {
                supabaseUsage.tier = SubscriptionTier.LIFETIME;
            }

            saveSubscription(supabaseUsage);
            isHydrated = true;

            // Sync TaskLimitManager
            if (supabaseUsage.tier === SubscriptionTier.LIFETIME) {
                TaskLimitManager.upgradeToPro();
            } else {
                if (TaskLimitManager.isPro()) {
                    // Persistence buffer: if we were pro locally, keep it until proven otherwise
                    supabaseUsage.tier = SubscriptionTier.LIFETIME;
                } else {
                    TaskLimitManager.resetToFree();
                }
            }

            return supabaseUsage;
        }
    } catch (e) {
        console.warn('Anti-Gravity Subscription: Reconciliation failed:', e);
    }

    return getSubscription();
};

// Get current subscription from localStorage
export const getSubscription = (): UserSubscription => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const subscription = JSON.parse(stored);

            // Legacy normalization
            if (subscription.tier === SubscriptionTier.PRO || subscription.tier === SubscriptionTier.PREMIUM) {
                subscription.tier = SubscriptionTier.LIFETIME;
            }

            // Trust TaskLimitManager
            if (TaskLimitManager.isPro()) {
                subscription.tier = SubscriptionTier.LIFETIME;
            }

            return subscription;
        } catch (e) {
            console.error('Anti-Gravity Subscription: Malformed localStorage data, resetting.', e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // Default: Free tier
    const isProFromLimit = TaskLimitManager.isPro();
    const defaultSubscription = {
        tier: isProFromLimit ? SubscriptionTier.LIFETIME : SubscriptionTier.FREE
    };
    saveSubscription(defaultSubscription);
    return defaultSubscription;
};

// Save subscription to localStorage
export const saveSubscription = (subscription: UserSubscription): void => {
    const prev = localStorage.getItem(STORAGE_KEY);
    const next = JSON.stringify(subscription);

    if (prev !== next) {
        localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new CustomEvent('subscription-updated'));
    }
};

// NO-OP: Counters removed
export const refundAICredit = async (operationType: AiOperationType = AiOperationType.HEAVY): Promise<void> => {
    console.log('AI Usage: 🛡️ Refund (NO-OP) - Counters removed');
};

// ALWAYS ALLOWED: Daily limits removed
export const canPerformOperation = (): { allowed: boolean; reason?: string } => {
    return { allowed: true };
};

// ALWAYS FALSE: No limits to be near
export const isNearAiLimit = (): boolean => {
    return false;
};

// AI check: Only Lifetime users get AI
export const canUseAI = (operationType: AiOperationType = AiOperationType.HEAVY): {
    allowed: boolean;
    reason?: string;
    remaining?: number;
    warning?: boolean;
    blockMode?: AiBlockMode;
} => {
    if (operationType === AiOperationType.GUIDANCE) {
        return { allowed: true, blockMode: AiBlockMode.NONE };
    }

    const subscription = getSubscription();

    if (subscription.tier === SubscriptionTier.LIFETIME) {
        return { allowed: true, blockMode: AiBlockMode.NONE };
    }

    return {
        allowed: false,
        reason: "AI features require Lifetime Access. Upgrade now for unlimited AI usage!",
        blockMode: AiBlockMode.BUY_PRO
    };
};

// NO-OP: Counters removed
export const recordOperation = (): void => {
    // No-op: No daily limits to track
};

// NO-OP: Counters removed
export const recordAIUsage = async (operationType: AiOperationType = AiOperationType.HEAVY): Promise<null> => {
    // No-op: AI is unlimited for Lifetime users
    return null;
};

// Listener for updates
export const subscribeToSubscription = (callback: () => void) => {
    window.addEventListener('subscription-updated', callback);
    return () => window.removeEventListener('subscription-updated', callback);
};

// Upgrade user to a tier
export const upgradeTier = (tier: SubscriptionTier, purchaseToken?: string): void => {
    const subscription = getSubscription();
    subscription.tier = tier;
    subscription.purchaseToken = purchaseToken;

    saveSubscription(subscription);

    try {
        if (tier === SubscriptionTier.LIFETIME || tier === SubscriptionTier.PRO) {
            TaskLimitManager.upgradeToPro();
        }
    } catch (e) {
        console.warn("TaskLimitManager sync failed");
    }

    syncUsageToServer(subscription);
};

// Unlimited limits
export const getCurrentLimits = () => {
    return {
        operationsPerDay: Infinity,
        aiDocsPerMonth: Infinity,
        maxFileSize: 200 * 1024 * 1024 // Keep some limit for sanity
    };
};
