// Subscription Service - Manages user tiers and usage limits
export enum SubscriptionTier {
    FREE = 'free',
    PRO = 'pro',
    PREMIUM = 'premium',
    LIFETIME = 'lifetime'
}

export interface UserSubscription {
    tier: SubscriptionTier;
    operationsToday: number;
    aiDocsThisWeek: number;
    lastOperationReset: string; // ISO date
    lastAiReset: string; // ISO date
    purchaseToken?: string;
}

const STORAGE_KEY = 'pdf_tools_subscription';

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

// Get current subscription from localStorage
export const getSubscription = (): UserSubscription => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }

    // Default free tier
    const now = new Date().toISOString();
    return {
        tier: SubscriptionTier.FREE,
        operationsToday: 0,
        aiDocsThisWeek: 0,
        lastOperationReset: now,
        lastAiReset: now,
    };
};

// Save subscription to localStorage
export const saveSubscription = (subscription: UserSubscription): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
};

// Check if user can perform a PDF operation
export const canPerformOperation = (): { allowed: boolean; reason?: string } => {
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

// Check if user can use AI
export const canUseAI = (): { allowed: boolean; reason?: string; remaining?: number } => {
    const subscription = getSubscription();

    // Reset weekly counter if needed
    const lastReset = new Date(subscription.lastAiReset);
    const now = new Date();
    const weeksDiff = Math.floor((now.getTime() - lastReset.getTime()) / (7 * 24 * 60 * 60 * 1000));

    if (weeksDiff >= 1) {
        subscription.aiDocsThisWeek = 0;
        subscription.lastAiReset = now.toISOString();
        saveSubscription(subscription);
    }

    // Check limits based on tier
    if (subscription.tier === SubscriptionTier.FREE) {
        if (subscription.aiDocsThisWeek >= FREE_LIMITS.aiDocsPerWeek) {
            return {
                allowed: false,
                reason: `You've used your 1 free AI document this week. Upgrade to Pro for 10 AI documents per month!`
            };
        }
        return { allowed: true, remaining: FREE_LIMITS.aiDocsPerWeek - subscription.aiDocsThisWeek };
    }

    if (subscription.tier === SubscriptionTier.PRO) {
        // For Pro, we track monthly (simplified to 30 AI docs per month = ~10/month)
        return { allowed: true, remaining: PRO_LIMITS.aiDocsPerMonth };
    }

    // Premium and Lifetime have unlimited
    return { allowed: true };
};

// Record a PDF operation
export const recordOperation = (): void => {
    const subscription = getSubscription();
    subscription.operationsToday += 1;
    saveSubscription(subscription);
};

// Record an AI usage
export const recordAIUsage = (): void => {
    const subscription = getSubscription();
    subscription.aiDocsThisWeek += 1;
    saveSubscription(subscription);
};

// Upgrade user to a tier
export const upgradeTier = (tier: SubscriptionTier, purchaseToken?: string): void => {
    const subscription = getSubscription();
    subscription.tier = tier;
    subscription.purchaseToken = purchaseToken;
    saveSubscription(subscription);
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
