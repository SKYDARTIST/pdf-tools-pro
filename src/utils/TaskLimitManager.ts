/**
 * TaskLimitManager - Manages daily task limits for free users
 * Free users: 3 tasks per day (resets at midnight)
 * Pro users: Unlimited tasks
 */

const STORAGE_KEY = 'pdf_tools_task_limit';
// Task limits removed - Unlimited for all tiers

interface TaskLimitData {
    count: number;
    date: string; // YYYY-MM-DD format
    isPro: boolean;
}

class TaskLimitManager {
    private static getTodayDate(): string {
        const now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    private static getData(): TaskLimitData {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            // SECURITY FIX: Read Pro status from SubscriptionService (single source of truth)
            const subscriptionData = this.getSubscriptionSync();
            const isProFromSubscription = subscriptionData?.tier === 'pro'
                || subscriptionData?.tier === 'premium'
                || subscriptionData?.tier === 'lifetime';

            if (!stored) {
                return {
                    count: 0,
                    date: this.getTodayDate(),
                    isPro: isProFromSubscription,
                };
            }

            const data = JSON.parse(stored);
            // Always sync Pro status from subscription service
            data.isPro = isProFromSubscription;
            return data;
        } catch (error) {
            console.error('Error reading task limit data:', error);
            const subscriptionData = this.getSubscriptionSync();
            return {
                count: 0,
                date: this.getTodayDate(),
                isPro: subscriptionData?.tier === 'pro' || subscriptionData?.tier === 'lifetime',
            };
        }
    }

    private static saveData(data: TaskLimitData): void {
        try {
            // Don't persist isPro - always read from SubscriptionService
            const dataToSave = {
                count: data.count,
                date: data.date,
                // isPro omitted intentionally - read from subscription
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving task limit data:', error);
        }
    }

    /**
     * Check if user has tasks remaining
     */
    static canUseTask(): boolean {
        // ALL users have unlimited PDF tasks now
        return true;
    }

    /**
     * Increment task count (call after successful task)
     */
    static incrementTask(): void {
        // No longer incrementing - Unlimited tasks
    }

    /**
     * Get remaining tasks for today
     */
    static getRemainingTasks(): number {
        return Infinity;
    }

    /**
     * Get used tasks for today
     */
    static getUsedTasks(): number {
        return 0;
    }

    /**
     * Check if user is Pro
     */
    static isPro(): boolean {
        // Reviewer access is now server-side only for security
        const data = this.getData();
        return data.isPro === true;
    }

    /**
     * Upgrade to Pro (call after payment)
     */
    static upgradeToPro(): void {
        // Pro status is managed by SubscriptionService only
        // This method is kept for API compatibility but does nothing
        console.log('TaskLimitManager: upgradeToPro() called - managed by SubscriptionService');
    }

    /**
     * Reset to free (for testing)
     */
    static resetToFree(): void {
        localStorage.removeItem(STORAGE_KEY);
        // Also clear any cached subscription just in case
        localStorage.removeItem('pdf_tools_subscription');
    }

    /**
     * Get daily limit
     */
    static getDailyLimit(): number {
        return Infinity;
    }

    /**
     * Get the full subscription state
     */
    static getSubscriptionSync(): any {
        const STORAGE_KEY_SUB = 'pdf_tools_subscription';
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SUB);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    }
}

export default TaskLimitManager;
