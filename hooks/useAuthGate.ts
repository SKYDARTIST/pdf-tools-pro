import { useState, useCallback } from 'react';
import { getCurrentUser } from '../services/googleAuthService';
import { initSubscription } from '../services/subscriptionService';

/**
 * Universal Authorization Gate Hook
 * Used to protect tools and features with mandatory Google Login.
 */
export const useAuthGate = () => {
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const requireAuth = useCallback(async (action: () => void) => {
        try {
            const user = await getCurrentUser();

            if (!user) {
                // Not logged in - store the action and show the modal
                console.log('🛡️ AuthGate: Access denied, opening login modal...');
                setPendingAction(() => action);
                setAuthModalOpen(true);
                return false;
            }

            // Already logged in - just run the action
            action();
            return true;
        } catch (error) {
            console.error('🛡️ AuthGate: Verification failed', error);
            return false;
        }
    }, []);

    const handleAuthSuccess = useCallback(async () => {
        setAuthModalOpen(false);

        // Refresh session/subscription data
        const user = await getCurrentUser();
        if (user) {
            await initSubscription(user);
        }

        // Execute the action that was blocked
        if (pendingAction) {
            console.log('🛡️ AuthGate: Success, resuming pending action...');
            pendingAction();
            setPendingAction(null);
        }
    }, [pendingAction]);

    return {
        authModalOpen,
        setAuthModalOpen,
        requireAuth,
        handleAuthSuccess
    };
};
