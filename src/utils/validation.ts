/**
 * Lightweight Validation Utils
 * Replaces Zod for basic API response validation to avoid heavy dependencies or install errors.
 */

import { Logger } from './logger';

export const validateSubscription = (data: any): boolean => {
    if (!data || typeof data !== 'object') {
        Logger.error('Validation', 'Invalid subscription data: not an object', data);
        return false;
    }

    const requiredFields = [
        'tier',
        'operations_today',
        'ai_docs_weekly',
        'ai_docs_monthly',
        'ai_pack_credits',
        'last_reset_daily',
    ];

    const missing = requiredFields.filter(field => data[field] === undefined);

    if (missing.length > 0) {
        Logger.error('Validation', `Invalid subscription data: missing fields [${missing.join(', ')}]`, data);
        return false;
    }

    return true;
};
