/**
 * TaskLimitManager - Manages daily task limits for free users
 * Free users: 3 tasks per day (resets at midnight)
 * Pro users: Unlimited tasks
 */

const STORAGE_KEY = 'pdf_tools_task_limit';
const FREE_DAILY_LIMIT = 3;

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
        // Pro users have unlimited tasks
        if (this.isPro()) {
            return true;
        }

        const data = this.getData();

        // Check if date has changed (new day)
        const today = this.getTodayDate();
        if (data.date !== today) {
            // Reset counter for new day
            this.saveData({
                count: 0,
                date: today,
                isPro: false,
            });
            return true;
        }

        // Check if under limit
        return data.count < FREE_DAILY_LIMIT;
    }

    /**
     * Increment task count (call after successful task)
     */
    static incrementTask(): void {
        const data = this.getData();

        // Don't increment for Pro users
        if (this.isPro()) {
            return;
        }

        // Check if date has changed
        const today = this.getTodayDate();
        if (data.date !== today) {
            // New day, reset and increment
            this.saveData({
                count: 1,
                date: today,
                isPro: false,
            });
        } else {
            // Same day, increment
            this.saveData({
                ...data,
                count: data.count + 1,
            });
        }
    }

    /**
     * Get remaining tasks for today
     */
    static getRemainingTasks(): number {
        const data = this.getData();

        // Pro users have unlimited
        if (this.isPro()) {
            return Infinity;
        }

        // Check if date has changed
        const today = this.getTodayDate();
        if (data.date !== today) {
            return FREE_DAILY_LIMIT;
        }

        return Math.max(0, FREE_DAILY_LIMIT - data.count);
    }

    /**
     * Get used tasks for today
     */
    static getUsedTasks(): number {
        const data = this.getData();

        // Check if date has changed
        const today = this.getTodayDate();
        if (data.date !== today) {
            return 0;
        }

        return data.count;
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
        return FREE_DAILY_LIMIT;
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
