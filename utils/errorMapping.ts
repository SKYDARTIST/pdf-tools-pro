/**
 * Error Mapping Utility
 * Translates technical backend errors into simple, friendly user messages.
 */

export const getFriendlyErrorMessage = (error: unknown): string => {
    const rawError = error instanceof Error ? error.message : String(error);
    const lowerError = rawError.toLowerCase();

    // 1. Connection / Network Issues
    if (
        lowerError.includes('fetch') ||
        lowerError.includes('network') ||
        lowerError.includes('failed to fetch') ||
        lowerError.includes('proxy error')
    ) {
        return "Connection failed. Please check your internet.";
    }

    // 2. Security / Integrity Issues
    if (
        lowerError.includes('integrity') ||
        lowerError.includes('signature') ||
        lowerError.includes('protocol') ||
        lowerError.includes('unauthorized') ||
        lowerError.includes('forbidden')
    ) {
        return "Security check failed. Please restart the app.";
    }

    // 3. User Cancelled
    if (lowerError.includes('cancelled') || lowerError.includes('dismissed')) {
        return "Sign in cancelled.";
    }

    // 4. Rate Limiting
    if (lowerError.includes('rate limit') || lowerError.includes('429')) {
        // Extract wait time if present (e.g., "wait 45 seconds")
        const waitMatch = lowerError.match(/wait (\d+) seconds/);
        if (waitMatch && waitMatch[1]) {
            return `Too many requests. Please wait ${waitMatch[1]} seconds.`;
        }
        return "Too many requests. Please wait a moment.";
    }

    // 5. Server Errors
    if (lowerError.includes('500') || lowerError.includes('internal server error')) {
        return "Our servers are having trouble. Try again later.";
    }

    // 6. Default Fallback (Simple)
    // If it's a short message, show it. If it's long generic junk, hide it.
    if (rawError.length < 50 && !lowerError.includes('{')) {
        return rawError;
    }

    return "Something went wrong. Please try again.";
};
