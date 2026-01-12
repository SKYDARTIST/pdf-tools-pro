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
            if (!stored) {
                return {
                    count: 0,
                    date: this.getTodayDate(),
                    isPro: false,
                };
            }
            return JSON.parse(stored);
        } catch (error) {
            console.error('Error reading task limit data:', error);
            return {
                count: 0,
                date: this.getTodayDate(),
                isPro: false,
            };
        }
    }

    private static saveData(data: TaskLimitData): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        // TESTING PERIOD: Use server-verified time to prevent clock manipulation
        // Import dynamically to avoid circular dependencies
        try {
            const { isTestingPeriodSync } = require('../services/serverTimeService');
            if (isTestingPeriodSync()) {
                return true;
            }
        } catch (e) {
            // Fallback to local time if service not available
            const TESTING_PERIOD_END = new Date('2026-01-28T23:59:59Z');
            if (new Date() < TESTING_PERIOD_END) {
                return true;
            }
        }

        const data = this.getData();
        return data.isPro;
    }

    /**
     * Upgrade to Pro (call after payment)
     */
    static upgradeToPro(): void {
        const data = this.getData();
        this.saveData({
            ...data,
            isPro: true,
        });
    }

    /**
     * Reset to free (for testing)
     */
    static resetToFree(): void {
        const data = this.getData();
        this.saveData({
            ...data,
            isPro: false,
        });
    }

    /**
     * Get daily limit
     */
    static getDailyLimit(): number {
        return FREE_DAILY_LIMIT;
    }

    /**
     * Reset all data (for testing)
     */
    static reset(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export default TaskLimitManager;
