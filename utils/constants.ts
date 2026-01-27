/**
 * Application Constants
 * Centralized source of truth for all string literals.
 */

export const STORAGE_KEYS = {
    SUBSCRIPTION: 'pdf_tools_subscription',
    DEVICE_ID: 'ag_device_id',
    GOOGLE_UID: 'google_uid',
    CONSUMED_PURCHASES: 'consumed_purchases',
    AUTH_TIMESTAMP: 'ag_auth_timestamp',
    AUTH_SIGNATURE: 'ag_auth_signature',
} as const;

export const HEADERS = {
    SIGNATURE: 'x-ag-signature',
    DEVICE_ID: 'x-ag-device-id',
    INTEGRITY_TOKEN: 'x-ag-integrity-token',
    CSRF_TOKEN: 'x-csrf-token',
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
} as const;

export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    PRO: 'pro',
    PREMIUM: 'premium',
    LIFETIME: 'lifetime',
} as const;

export const AI_OPERATION_TYPES = {
    HEAVY: 'heavy',
    GUIDANCE: 'guidance',
} as const;

export const DEFAULTS = {
    FREE_DAILY_LIMIT: 5,
    FREE_MONTHLY_AI_DOCS: 3,
    PRO_MONTHLY_AI_DOCS: 50,
} as const;

export const API_ENDPOINTS = {
    SUBSCRIPTION: '/api/user/subscription',
    INDEX: '/api/index',
} as const;

