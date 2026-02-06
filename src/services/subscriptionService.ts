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

export const FREE_TOOLS = ['scanner', 'merge', 'split', 'image-to-pdf', 'view'];


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
    console.log('Anti-Gravity Subscription: 🔄 Initializing subscription...', {
        timestamp: new Date().toISOString()
    });

    // CRITICAL: Trigger pending purchase recovery BEFORE checking subscription
    // This ensures failed purchases from previous sessions are recovered
    try {
        const BillingService = (await import('./billingService')).default;
        const pending = await BillingService.getPendingQueue();
        if (pending.length > 0) {
            console.log('Anti-Gravity Subscription: 🔐 Found pending purchases, triggering recovery...', {
                count: pending.length
            });
            // Don't await - run in background
            BillingService.initialize().catch(e => console.warn('Pending purchase recovery failed:', e));
        }
    } catch (e) {
        console.warn('Anti-Gravity Subscription: Could not check pending purchases:', e);
    }

    // Run drift reconciliation in the background - don't block boot
    reconcileSubscriptionDrift().catch(e => console.warn('Background drift sync failed:', e));

    // Force reconcile with a hard timeout to prevent hanging the app boot
    // If it fails or times out, we'll just use the cached version from getSubscription()
    try {
        console.log('Anti-Gravity Subscription: ⏱️ Attempting server sync with 2.5s timeout...');
        const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Sync Timeout')), 2500)
        );

        const syncPromise = forceReconcileFromServer();

        const result = await Promise.race([syncPromise, timeoutPromise]) as UserSubscription;
        console.log('Anti-Gravity Subscription: ✅ Server sync successful', {
            tier: result.tier
        });
        return result;
    } catch (e) {
        console.warn('Anti-Gravity Subscription: ⏳ Initial sync timed out, using fallback:', e);
        return getSubscription();
    }
};

/**
 * Authoritatively syncs local tier with backend user_accounts table
 */
export const reconcileSubscriptionDrift = async (): Promise<void> => {
    try {
        const googleUid = localStorage.getItem(STORAGE_KEYS.GOOGLE_UID);
        if (!googleUid) {
            console.log('Anti-Gravity Subscription: No Google UID, skipping drift reconciliation');
            return;
        }

        console.log('Anti-Gravity Subscription: 🔄 Running drift reconciliation with server...');

        const response = await secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
            method: 'POST',
            body: JSON.stringify({ type: 'check_subscription_status' })
        });

        if (response.ok) {
            const data = await response.json();

            // SAFETY: Validate response before accessing properties
            if (!data || typeof data !== 'object') {
                console.error('Anti-Gravity Subscription: Invalid response format from server');
                return;
            }

            if (data.tier) {
                const sub = getSubscription();
                if (sub.tier !== data.tier) {
                    console.log(`🛡️ Anti-Gravity Subscription: Drift detected! Updating local tier ${sub.tier} -> ${data.tier}`);
                    upgradeTier(data.tier as SubscriptionTier, undefined);
                } else {
                    console.log('Anti-Gravity Subscription: ✅ Tier is in sync', { tier: data.tier });
                }
            }
        } else {
            console.warn('Anti-Gravity Subscription: ⚠️ Drift reconciliation returned non-OK status:', response.status);
        }
    } catch (e: any) {
        console.error('Anti-Gravity Subscription: ❌ Drift reconciliation failed:', e.message);
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

            // Sync TaskLimitManager - server is source of truth
            if (supabaseUsage.tier === SubscriptionTier.LIFETIME) {
                TaskLimitManager.upgradeToPro();
            } else {
                TaskLimitManager.resetToFree();
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

            return subscription;
        } catch (e) {
            console.error('Anti-Gravity Subscription: Malformed localStorage data, wiping and resetting.', e);
            // AGGRESSIVE WIPE: Clear corrupted keys to break potential error loops
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('ag_session_token'); // Also clear session as it's likely tied to the corruption
            localStorage.removeItem('ag_session_expiry');
        }
    }

    // Default: Free tier
    const defaultSubscription: UserSubscription = {
        tier: SubscriptionTier.FREE
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
        reason: "Pro & Neural features require Lifetime Access. Upgrade now for unlimited AI and Pro tools!",
        blockMode: AiBlockMode.BUY_PRO
    };
};

/**
 * Feature Gate: Check if a tool is accessible by the current tier
 */
export const canUseTool = (toolId: string): {
    allowed: boolean;
    reason?: string;
    blockMode?: AiBlockMode;
} => {
    const subscription = getSubscription();

    // Lifetime gets everything
    if (subscription.tier === SubscriptionTier.LIFETIME) {
        return { allowed: true, blockMode: AiBlockMode.NONE };
    }

    // Check if it's in the free list
    const toolIdLower = toolId.toLowerCase();
    if (FREE_TOOLS.includes(toolIdLower)) {
        return { allowed: true, blockMode: AiBlockMode.NONE };
    }

    // Otherwise, it's a Pro feature
    return {
        allowed: false,
        reason: "This tool is part of the Pro & Neural Workspace. Upgrade to Lifetime for access!",
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

// Phase 4: Post-Purchase Validation Check
export const checkPostPurchaseStatus = async (): Promise<void> => {
    try {
        const BillingService = (await import('./billingService')).default;
        const pending = await BillingService.getPendingQueue();

        if (pending.length === 0) {
            console.log('Anti-Gravity Subscription: No pending purchases to check');
            return;
        }

        console.log('Anti-Gravity Subscription: 🔍 Checking pending purchases', {
            count: pending.length,
            timestamp: new Date().toISOString()
        });

        for (const purchase of pending) {
            const age = Date.now() - (purchase.addedAt || 0);
            const oneHour = 60 * 60 * 1000;

            if (age > oneHour) {
                console.warn('Anti-Gravity Subscription: Found stale pending purchase', {
                    transactionId: purchase.transactionId,
                    ageMs: age
                });

                const wantVerify = window.confirm(
                    '🛰️ RECOVERY PROTOCOL\n\n' +
                    'We noticed a pending Lifetime Pro purchase from a previous session.\n\n' +
                    'Your payment was processed by Google. Would you like us to verify and unlock your Pro features now?'
                );
                if (wantVerify) {
                    console.log('Anti-Gravity Subscription: 🔐 User confirmed recovery, attempting verification...');
                    try {
                        // Force reconcile with timeout
                        const timeoutPromise = new Promise<void>((_, reject) =>
                            setTimeout(() => reject(new Error('Recovery sync timeout')), 5000)
                        );
                        const syncPromise = forceReconcileFromServer();
                        await Promise.race([syncPromise, timeoutPromise]);

                        // Also trigger the billing service to process its queue
                        console.log('Anti-Gravity Subscription: Initializing billing service for final processing...');
                        await BillingService.initialize();

                        console.log('Anti-Gravity Subscription: ✅ Recovery completed');
                    } catch (recoveryError: any) {
                        console.error('Anti-Gravity Subscription: ❌ Recovery failed:', recoveryError.message);
                        alert('Recovery failed. Your purchase is still safe and will be verified automatically.');
                    }
                } else {
                    console.log('Anti-Gravity Subscription: User deferred recovery, will retry automatically');
                    alert('✅ Your purchase is safe! We\'ll automatically verify it in the background.');
                }
                break; // Only prompt once
            }
        }
    } catch (e) {
        console.error('Anti-Gravity Subscription: Post-purchase check failed:', e);
    }
};
