import { InAppReview } from '@capacitor-community/in-app-review';
import FileHistoryManager from '@/utils/FileHistoryManager';

const REVIEW_STORAGE_KEY = 'ag_review_state';
const MIN_SUCCESS_COUNT = 3;
const MAX_PROMPTS = 2;
const COOLDOWN_DAYS = 60;

interface ReviewState {
    promptCount: number;
    lastPromptedAt: number | null;
}

function getState(): ReviewState {
    try {
        const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return { promptCount: 0, lastPromptedAt: null };
}

function saveState(state: ReviewState): void {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state));
}

export async function maybeRequestReview(): Promise<void> {
    const stats = FileHistoryManager.getStats();
    if (stats.successCount < MIN_SUCCESS_COUNT) return;

    const state = getState();
    if (state.promptCount >= MAX_PROMPTS) return;

    if (state.lastPromptedAt) {
        const daysSince = (Date.now() - state.lastPromptedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < COOLDOWN_DAYS) return;
    }

    try {
        await InAppReview.requestReview();
        saveState({
            promptCount: state.promptCount + 1,
            lastPromptedAt: Date.now(),
        });
    } catch {
        // Silently fail — web browser or unsupported platform
    }
}
