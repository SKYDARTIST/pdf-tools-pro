import { fetchUserUsage, syncUsageToServer } from './usageService';
import TaskLimitManager from '../utils/TaskLimitManager';
import { SecurityLogger } from '../utils/securityUtils';

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

const STORAGE_KEY = 'pdf_tools_subscription';
let isHydrated = false; // Memory flag to track if we've synced with server this session

// Free tier limits
const FREE_LIMITS = {
    operationsPerDay: 3,
    aiDocsPerWeek: 1,
    maxFileSize: 5 * 1024 * 1024, // 5MB
};

const PRO_LIMITS = {
    operationsPerDay: Infinity,
    aiDocsPerMonth: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
};

const PREMIUM_LIMITS = {
    operationsPerDay: Infinity,
    aiDocsPerMonth: Infinity,
    maxFileSize: 200 * 1024 * 1024, // 200MB
};

// Initialize subscription from Supabase or localStorage
export const initSubscription = async (user?: any): Promise<UserSubscription> => {
    try {
        const supabaseUsage = await fetchUserUsage();
        if (supabaseUsage) {
            SecurityLogger.log('Anti-Gravity Subscription: ✅ Restored state from Supabase');
            saveSubscription(supabaseUsage);
            isHydrated = true;

            // Sync TaskLimitManager if needed
            if (supabaseUsage.tier === SubscriptionTier.PRO) {
                TaskLimitManager.upgradeToPro();
            }

            return supabaseUsage;
        }
    } catch (e) {
        console.warn('Anti-Gravity Subscription: Failed to restore from Supabase, falling back to local:', e);
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

            // SECURITY: Restore tier from TaskLimitManager (trusted source)
            // Never trust tier from localStorage - it must come from Supabase
            subscription.tier = TaskLimitManager.isPro() ? SubscriptionTier.PRO : SubscriptionTier.FREE;

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
        aiPackCredits: isProFromLimit ? 100 : 0,
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
    // SECURITY: Do not cache sensitive fields in localStorage to prevent manipulation.
    // - aiPackCredits: Real value is restored from Supabase
    // - tier: Must come from Supabase only, not from localStorage
    // Only operational counters are persisted locally.
    const toStore = { ...subscription };
    toStore.aiPackCredits = 0;
    delete toStore.tier; // Remove tier - always derive from Supabase or TaskLimitManager

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
};

// Check if user is within the 20-day trial period
export const isInTrialPeriod = (): boolean => {
    /* DISABLED for IAP verification
    const subscription = getSubscription();

    // If no trial start date, they're an old user - no trial
    if (!subscription.trialStartDate) {
        return false;
    }

    const trialStart = new Date(subscription.trialStartDate);
    const now = new Date();
    const daysSinceTrialStart = Math.floor((now.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000));

    return daysSinceTrialStart < 20;
    */
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
        return subscription.aiDocsThisWeek >= FREE_LIMITS.aiDocsPerWeek;
    }

    if (subscription.tier === SubscriptionTier.PRO) {
        // High efficiency: warn when less than 3 docs remaining in monthly quota
        return (PRO_LIMITS.aiDocsPerMonth - subscription.aiDocsThisMonth) <= 3;
    }

    return false;
};

// Get the latest notification message if a milestone is hit
export const getAiPackNotification = (): { message: string; type: 'milestone' | 'warning' | 'exhausted' } | null => {
    // TEMPORARILY DISABLED FOR 20-DAY TESTING PERIOD (15-20 testers)
    // Re-enable after testing is complete
    return null;

    /* ORIGINAL CODE - UNCOMMENT AFTER TESTING:
    const subscription = getSubscription();
    // Only notify if user actually has/had an AI pack
    if (subscription.aiPackCredits === undefined && (subscription.lastNotifiedCredits === undefined || subscription.lastNotifiedCredits === 0)) {
        return null;
    }

    const credits = subscription.aiPackCredits || 0;
    const lastNotified = subscription.lastNotifiedCredits ?? 101;

    // Don't notify if we haven't consumed anything since last notification
    if (credits === lastNotified) return null;

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
    */
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
        if (subscription.aiDocsThisWeek >= FREE_LIMITS.aiDocsPerWeek) {
            return {
                allowed: false,
                reason: `You've used your 1 free AI document this week. Upgrade to Pro for 10 AI documents per month or buy an AI Pack!`,
                blockMode: AiBlockMode.BUY_PRO
            };
        }
        return { allowed: true, remaining: FREE_LIMITS.aiDocsPerWeek - subscription.aiDocsThisWeek, warning, blockMode: AiBlockMode.NONE };
    }

    if (subscription.tier === SubscriptionTier.PRO) {
        if (subscription.aiDocsThisMonth >= PRO_LIMITS.aiDocsPerMonth) {
            return {
                allowed: false,
                reason: `You've used all 10 AI documents this month. Buy an AI Pack for 100 more credits!`,
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
export const recordAIUsage = async (operationType: AiOperationType = AiOperationType.HEAVY): Promise<void> => {
    // Skip recording for guidance - it's free!
    if (operationType === AiOperationType.GUIDANCE) {
        console.log('AI Usage: GUIDANCE operation - no credits consumed');
        return;
    }

    // AUTH SAFETY: If user is logged in but we haven't hydrated from server yet, 
    // fetch server data first to avoid overwriting with stale local data
    const googleUid = localStorage.getItem('google_uid');
    if (googleUid && !isHydrated) {
        console.log('AI Usage: 🛡️ Forced hydration triggered before operation');
        await initSubscription();
    }

    const subscription = getSubscription();

    // Only consume credits for HEAVY operations
    if (subscription.aiPackCredits > 0) {
        subscription.aiPackCredits -= 1;
        console.log(`AI Usage: HEAVY operation - AI Pack credits: ${subscription.aiPackCredits} remaining`);

        // CRITICAL: If credits reached zero, acknowledge the purchase to Google Play
        // This marks it as "consumed" so it won't be restored again
        if (subscription.aiPackCredits === 0) {
            console.log('AI Usage: ⚠️ AI Pack fully consumed - marking as consumed on Google Play');
            markAiPackConsumed();
        }
    } else if (subscription.tier === SubscriptionTier.FREE) {
        subscription.aiDocsThisWeek += 1;
        console.log(`AI Usage: HEAVY operation - Free tier: ${subscription.aiDocsThisWeek}/${FREE_LIMITS.aiDocsPerWeek} used this week`);
    } else if (subscription.tier === SubscriptionTier.PRO) {
        subscription.aiDocsThisMonth += 1;
        console.log(`AI Usage: HEAVY operation - Pro tier: ${subscription.aiDocsThisMonth}/${PRO_LIMITS.aiDocsPerMonth} used this month`);
    }

    saveSubscription(subscription);
    await syncUsageToServer(subscription);
};

// Mark AI Pack as consumed to prevent re-restoration after uninstall
const markAiPackConsumed = (): void => {
    try {
        // Store a flag that we've consumed the AI Pack
        // This prevents granting credits for the same purchase multiple times
        const consumedPurchases = JSON.parse(localStorage.getItem('consumed_purchases') || '[]');

        // Only add if not already marked as consumed
        if (!consumedPurchases.some((p: any) => p.productId === 'ai_pack_100')) {
            consumedPurchases.push({
                productId: 'ai_pack_100',
                consumedAt: new Date().toISOString()
            });
            localStorage.setItem('consumed_purchases', JSON.stringify(consumedPurchases));
        }

        console.log('AI Usage: AI Pack fully consumed - will not be restored again on reinstall');
    } catch (error) {
        console.error('AI Usage: Failed to mark AI Pack as consumed:', error);
    }
};

// Check if a purchase has already been consumed (granted credits)
export const isAiPackAlreadyConsumed = (): boolean => {
    try {
        const consumedPurchases = JSON.parse(localStorage.getItem('consumed_purchases') || '[]');
        return consumedPurchases.some((p: any) => p.productId === 'ai_pack_100');
    } catch {
        return false;
    }
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

    // TESTING PERIOD: Also grant 100 Neural Pack credits with Pro upgrade
    // BUT only if they haven't received it before (prevents reset on reinstall)
    // AND if skipBonus is false (restored users don't get new bonus)
    const TESTING_PERIOD_END = new Date('2026-01-01T23:59:59Z');
    const isTestingPeriod = new Date() < TESTING_PERIOD_END;
    if (!skipBonus && isTestingPeriod && tier === SubscriptionTier.PRO && !subscription.hasReceivedBonus) {
        if (!subscription.aiPackCredits || subscription.aiPackCredits === 0) {
            subscription.aiPackCredits = 100;
        }
        subscription.hasReceivedBonus = true;
        saveSubscription(subscription); // Ensure we save the bonus update
    }

    // Persist to Supabase so it's not overwritten on next reload
    syncUsageToServer(subscription);
};

// Add AI Pack Credits
export const addAiPackCredits = (amount: number = 100): void => {
    const subscription = getSubscription();

    // Simple production behavior: add to existing credits
    subscription.aiPackCredits = (subscription.aiPackCredits || 0) + amount;

    saveSubscription(subscription);
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
