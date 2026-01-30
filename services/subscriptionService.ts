import { fetchUserUsage, syncUsageToServer } from './usageService';
import TaskLimitManager from '../utils/TaskLimitManager';
import { SecurityLogger } from '../utils/securityUtils';

import { STORAGE_KEYS, SUBSCRIPTION_TIERS, AI_OPERATION_TYPES, DEFAULTS } from '../utils/constants';
import AuthService from './authService';
import Config from './configService';
import { getDeviceId } from './deviceService';
import { secureFetch } from './apiService';

// Subscription Service - Manages user tiers and usage limits
export enum SubscriptionTier {
    FREE = 'free',
    PRO = 'pro',
    PREMIUM = 'premium',
    LIFETIME = 'lifetime'
}

// AI Operation Types - Determines if credits are consumed
export enum AiOperationType {
    // HEAVY: Consumes AI credits (Workspace, Audit, Briefing, Extractor, Redact, Compare)
    HEAVY = 'heavy',
    // GUIDANCE: Free for all users (Scanner guidance, Reader mindmaps/outlines)
    GUIDANCE = 'guidance'
}

// Blocking modes when AI limits are hit
export enum AiBlockMode {
    BUY_PRO = 'buy_pro',           // Free user needs to buy Pro
    BUY_CREDITS = 'buy_credits',   // Pro user needs to buy AI Pack
    NONE = 'none'                   // No blocking
}

export interface UserSubscription {
    tier: SubscriptionTier;
    operationsToday: number;
    aiDocsThisWeek: number;
    aiDocsThisMonth: number;
    aiPackCredits: number;
    lastOperationReset: string; // ISO date
    lastAiWeeklyReset: string; // ISO date
    lastAiMonthlyReset: string; // ISO date
    trialStartDate?: string; // ISO date - when the 20-day trial started
    purchaseToken?: string;
    lastNotifiedCredits?: number;
    hasReceivedBonus: boolean;
}

const STORAGE_KEY = STORAGE_KEYS.SUBSCRIPTION;
let isHydrated = false; // Memory flag to track if we've synced with server this session

const FREE_LIMITS = {
    operationsPerDay: DEFAULTS.FREE_DAILY_LIMIT,
    aiDocsPerMonth: 3, // EXACT REQUESTed: 3 for free version
    maxFileSize: 10 * 1024 * 1024, // 10MB
};

const PRO_LIMITS = {
    operationsPerDay: Infinity,
    aiDocsPerMonth: 50, // EXACT REQUESTED: 50 per month for pro pass
    maxFileSize: 100 * 1024 * 1024, // 100MB
};

const PREMIUM_LIMITS = {
    operationsPerDay: Infinity,
    aiDocsPerMonth: Infinity,
    maxFileSize: 200 * 1024 * 1024, // 200MB
};

// Initialize subscription from Supabase or localStorage
export const initSubscription = async (user?: any): Promise<UserSubscription> => {
    // Proactive reconciliation on every boot (Security Fix #7)
    // Await drift check first to settle tier before returning reconcile
    await reconcileSubscriptionDrift().catch(e => console.warn('Background drift sync failed:', e));
    return await forceReconcileFromServer();
};

/**
 * Proactive Reconciliation (Security Fix #7)
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
                    upgradeTier(data.tier as SubscriptionTier, undefined, true);
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
            saveSubscription(supabaseUsage);
            isHydrated = true;

            // Sync TaskLimitManager
            if (supabaseUsage.tier === SubscriptionTier.PRO || supabaseUsage.tier === SubscriptionTier.LIFETIME) {
                console.log('Anti-Gravity Subscription: 🛡️ Tier confirmed Pro/Lifetime from server');
                TaskLimitManager.upgradeToPro();
            } else {
                // PERSISTENCE BUFFER: Don't downgrade immediately if we think we are Pro locally.
                // This prevents the "Flash of Free Tier" if the DB update is lagging behind a successful purchase.
                if (TaskLimitManager.isPro()) {
                    console.warn('Anti-Gravity Subscription: ⚠️ Server says Free but Local says Pro. Preserving local state until manual restore or native sync.');
                    // We return PRO for now to avoid UI flickering
                    supabaseUsage.tier = SubscriptionTier.PRO;
                } else {
                    console.log('Anti-Gravity Subscription: ℹ️ Tier confirmed Free from server');
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

            // RETROACTIVE TRIAL: Add trial start date to existing users who don't have it
            if (!subscription.trialStartDate) {
                subscription.trialStartDate = new Date().toISOString();
                saveSubscription(subscription);
            }

            // SECURITY: Restore tier from TaskLimitManager (trusted source) if local state is missing
            if (!subscription.tier || subscription.tier === SubscriptionTier.FREE) {
                if (TaskLimitManager.isPro()) {
                    subscription.tier = SubscriptionTier.PRO;
                }
            }

            // SANITY CHECK: Reset trial credits (999+) to 0 to force monthy quota usage
            if (subscription.aiPackCredits >= 990) {
                subscription.aiPackCredits = 0;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
            }

            return subscription;
        } catch (e) {
            console.error('Anti-Gravity Subscription: Malformed localStorage data, resetting.', e);
            localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
            // Fall through to default behavior below
        }
    }

    // Default: Free tier with no credits (until purchased)
    const now = new Date().toISOString();
    const isProFromLimit = TaskLimitManager.isPro();
    const defaultSubscription = {
        tier: isProFromLimit ? SubscriptionTier.PRO : SubscriptionTier.FREE,
        operationsToday: 0,
        aiDocsThisWeek: 0,
        aiDocsThisMonth: 0,
        aiPackCredits: 0,
        lastOperationReset: now,
        lastAiWeeklyReset: now,
        lastAiMonthlyReset: now,
        trialStartDate: now,
        hasReceivedBonus: false,
    };
    saveSubscription(defaultSubscription);
    return defaultSubscription;
};

// Save subscription to localStorage
export const saveSubscription = (subscription: UserSubscription): void => {
    // PERSISTENCE: We save the full state (tier, credits) locally for instant hydration.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));

    // NOTIFY UI: Dispatch custom event for reactive components (UsageStats)
    window.dispatchEvent(new CustomEvent('subscription-updated'));
};

// Check if user is within the 20-day trial period
export const isInTrialPeriod = (): boolean => {
    // Audit Response P2: Completely disabled trial logic
    return false;
};

// Check if user can perform a PDF operation
export const canPerformOperation = (): { allowed: boolean; reason?: string } => {
    // 20-DAY TRIAL: Unlimited operations
    if (isInTrialPeriod()) {
        return { allowed: true };
    }

    const subscription = getSubscription();

    // Reset daily counter if needed
    const lastReset = new Date(subscription.lastOperationReset);
    const now = new Date();
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
        subscription.operationsToday = 0;
        subscription.lastOperationReset = now.toISOString();
        saveSubscription(subscription);
    }

    // Check limits based on tier
    if (subscription.tier === SubscriptionTier.FREE) {
        if (subscription.operationsToday >= FREE_LIMITS.operationsPerDay) {
            return {
                allowed: false,
                reason: `You've reached your daily limit of ${FREE_LIMITS.operationsPerDay} operations. Upgrade to Pro for unlimited access!`
            };
        }
    }

    return { allowed: true };
};

// Check if user is near their AI limit
export const isNearAiLimit = (): boolean => {
    const subscription = getSubscription();

    // 1. Check AI Pack Credits First (High Priority)
    if (subscription.aiPackCredits > 0) {
        // AI Pack efficiency: warn when less than 10 credits remaining
        return subscription.aiPackCredits <= 10;
    }

    // 2. Tier Specific Limits
    if (subscription.tier === SubscriptionTier.FREE) {
        return subscription.aiDocsThisMonth >= FREE_LIMITS.aiDocsPerMonth;
    }

    if (subscription.tier === SubscriptionTier.PRO) {
        // High efficiency: warn when less than 3 docs remaining in monthly quota
        return (PRO_LIMITS.aiDocsPerMonth - subscription.aiDocsThisMonth) <= 3;
    }

    return false;
};

// Get the latest notification message if a milestone is hit
export const getAiPackNotification = (): { message: string; type: 'milestone' | 'warning' | 'exhausted' } | null => {
    const subscription = getSubscription();

    // 1. SILENCE for 999 pack (Unlimited Experience)
    if (subscription.aiPackCredits >= 990) return null;

    // 2. Only notify if user actually has/had an AI pack
    if (subscription.aiPackCredits === undefined && (subscription.lastNotifiedCredits === undefined || subscription.lastNotifiedCredits === 0)) {
        return null;
    }

    const credits = subscription.aiPackCredits || 0;

    // 3. INITIALIZATION SAFETY: If lastNotified is not set, set it to current credits to avoid "Empty" flash on mount
    if (subscription.lastNotifiedCredits === undefined) {
        subscription.lastNotifiedCredits = credits;
        saveSubscription(subscription);
        return null;
    }

    const lastNotified = subscription.lastNotifiedCredits;

    // Don't notify if we haven't consumed anything since last notification
    if (credits === lastNotified) return null;

    // 4. EXHAUSTED: Only if they just dropped to 0 from something higher
    if (credits === 0 && lastNotified > 0) {
        return { message: "AI Credits Empty. Buy more credits to continue using AI tools.", type: 'exhausted' };
    }

    if (credits <= 10 && credits > 0 && lastNotified > credits) {
        return { message: `AI Credits Low: ${credits} remaining.`, type: 'warning' };
    }

    // Every 10 milestone
    if (credits > 10 && credits % 10 === 0 && lastNotified > credits) {
        return { message: `AI Credits: ${credits} remaining.`, type: 'milestone' };
    }

    return null;
};

// Acknowledge a notification to prevent re-rendering
export const ackAiNotification = (): void => {
    const subscription = getSubscription();
    subscription.lastNotifiedCredits = subscription.aiPackCredits;
    saveSubscription(subscription);
};

// Check if user can use AI
export const canUseAI = (operationType: AiOperationType = AiOperationType.HEAVY): {
    allowed: boolean;
    reason?: string;
    remaining?: number;
    warning?: boolean;
    blockMode?: AiBlockMode;
} => {
    // GUIDANCE: Always allowed for all users (Zero Cost to users)
    if (operationType === AiOperationType.GUIDANCE) {
        return { allowed: true, blockMode: AiBlockMode.NONE };
    }

    // 20-DAY TRIAL: Unlimited AI usage
    if (isInTrialPeriod()) {
        return { allowed: true, blockMode: AiBlockMode.NONE };
    }

    const subscription = getSubscription();
    const now = new Date();
    const warning = isNearAiLimit();

    // 1. Check AI Pack Credits First (High Priority)
    if (subscription.aiPackCredits > 0) {
        return { allowed: true, remaining: subscription.aiPackCredits, warning, blockMode: AiBlockMode.NONE };
    }

    // 2. Weekly Reset for Free Tier
    const lastWeeklyReset = new Date(subscription.lastAiWeeklyReset);
    const weeksDiff = Math.floor((now.getTime() - lastWeeklyReset.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksDiff >= 1) {
        subscription.aiDocsThisWeek = 0;
        subscription.lastAiWeeklyReset = now.toISOString();
        saveSubscription(subscription);
    }

    // 3. Monthly Reset for Pro Tier
    const lastMonthlyReset = new Date(subscription.lastAiMonthlyReset);
    const monthsDiff = (now.getFullYear() - lastMonthlyReset.getFullYear()) * 12 + (now.getMonth() - lastMonthlyReset.getMonth());
    if (monthsDiff >= 1) {
        subscription.aiDocsThisMonth = 0;
        subscription.lastAiMonthlyReset = now.toISOString();
        saveSubscription(subscription);
    }

    // 4. Check limits based on tier
    if (subscription.tier === SubscriptionTier.FREE) {
        if (subscription.aiDocsThisMonth >= FREE_LIMITS.aiDocsPerMonth) {
            return {
                allowed: false,
                reason: `You've used your ${FREE_LIMITS.aiDocsPerMonth} free AI documents this month. Upgrade to Pro for 50 AI documents per month!`,
                blockMode: AiBlockMode.BUY_PRO
            };
        }
        return { allowed: true, remaining: FREE_LIMITS.aiDocsPerMonth - subscription.aiDocsThisMonth, warning, blockMode: AiBlockMode.NONE };
    }

    if (subscription.tier === SubscriptionTier.PRO) {
        if (subscription.aiDocsThisMonth >= PRO_LIMITS.aiDocsPerMonth) {
            return {
                allowed: false,
                reason: `You've used all ${PRO_LIMITS.aiDocsPerMonth} AI documents this month. Buy an AI Pack for 100 more credits!`,
                blockMode: AiBlockMode.BUY_CREDITS
            };
        }
        return { allowed: true, remaining: PRO_LIMITS.aiDocsPerMonth - subscription.aiDocsThisMonth, warning, blockMode: AiBlockMode.NONE };
    }

    // Premium and Lifetime have unlimited
    return { allowed: true, blockMode: AiBlockMode.NONE };
};

// Check if a specific credit level is a milestone the user should be notified about
const isMilestone = (credits: number): boolean => {
    if (credits === 0) return true;
    if (credits <= 10) return true;
    return credits % 10 === 0;
};

// Record a PDF operation
export const recordOperation = (): void => {
    const subscription = getSubscription();
    subscription.operationsToday += 1;
    saveSubscription(subscription);
};

// Record an AI usage
export const recordAIUsage = async (operationType: AiOperationType = AiOperationType.HEAVY): Promise<{
    tier: SubscriptionTier;
    used: number;
    limit: number;
    remaining: number;
    message?: string;
} | null> => {
    // Skip recording for guidance - it's free!
    if (operationType === AiOperationType.GUIDANCE) {
        console.log('AI Usage: GUIDANCE operation - no credits consumed');
        return null; // No notification needed
    }

    // AUTH SAFETY: If user is logged in but we haven't hydrated from server yet, 
    // fetch server data first to avoid overwriting with stale local data
    const googleUid = localStorage.getItem(STORAGE_KEYS.GOOGLE_UID);
    if (googleUid && !isHydrated) {
        console.log('AI Usage: 🛡️ Forced hydration triggered before operation');
        await initSubscription();
    }

    const subscription = getSubscription();
    let stats = null;

    // Logic for tracking usage
    if (subscription.aiPackCredits > 0) {
        // Priority 1: Use AI Pack Credits (the 999 balance)
        subscription.aiPackCredits -= 1;
        const remaining = subscription.aiPackCredits;
        console.log(`AI Usage: HEAVY operation - AI Pack Credit consumed. ${remaining} remaining.`);

        stats = {
            tier: subscription.tier,
            used: 1,
            limit: 999, // Total pack
            remaining,
            message: `AI Pack: ${remaining} credits remaining`
        };
    } else if (subscription.tier === SubscriptionTier.FREE) {
        subscription.aiDocsThisMonth += 1;
        const used = subscription.aiDocsThisMonth;
        const limit = FREE_LIMITS.aiDocsPerMonth;
        const remaining = Math.max(0, limit - used);

        stats = {
            tier: SubscriptionTier.FREE,
            used,
            limit,
            remaining,
            message: `Free Tier: ${used}/${limit} docs used this month`
        };
    } else {
        // PRO or above (no pack credits)
        subscription.aiDocsThisMonth += 1;
        const used = subscription.aiDocsThisMonth;
        const limit = PRO_LIMITS.aiDocsPerMonth;
        const remaining = Math.max(0, limit - used);

        stats = {
            tier: subscription.tier,
            used,
            limit,
            remaining,
            message: `Pro Plan: ${used}/${limit} docs used this month`
        };
    }

    saveSubscription(subscription);

    // SILENT SYNC: Sync to server in background
    syncUsageToServer(subscription).catch(err => console.error('Subscription Sync Failed:', err));

    return stats;
};

// Internal helper for UsageStats to listen for updates
export const subscribeToSubscription = (callback: () => void) => {
    window.addEventListener('subscription-updated', callback);
    return () => window.removeEventListener('subscription-updated', callback);
};


// Upgrade user to a tier
export const upgradeTier = (tier: SubscriptionTier, purchaseToken?: string, skipBonus: boolean = false): void => {
    const subscription = getSubscription();
    subscription.tier = tier;
    subscription.purchaseToken = purchaseToken;

    saveSubscription(subscription);

    // Sync with TaskLimitManager
    try {
        if (tier === SubscriptionTier.PRO || tier === SubscriptionTier.PREMIUM || tier === SubscriptionTier.LIFETIME) {
            TaskLimitManager.upgradeToPro();
        }
    } catch (e) {
        console.warn("TaskLimitManager sync failed");
    }

    // Persist to Supabase so it's not overwritten on next reload
    syncUsageToServer(subscription);
};

// Get limits for current tier
export const getCurrentLimits = () => {
    const subscription = getSubscription();

    switch (subscription.tier) {
        case SubscriptionTier.FREE:
            return FREE_LIMITS;
        case SubscriptionTier.PRO:
            return PRO_LIMITS;
        case SubscriptionTier.PREMIUM:
        case SubscriptionTier.LIFETIME:
            return PREMIUM_LIMITS;
        default:
            return FREE_LIMITS;
    }
};
