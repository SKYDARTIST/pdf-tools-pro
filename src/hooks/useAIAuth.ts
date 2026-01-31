import { useState } from 'react';
import { getCurrentUser } from '@/services/googleAuthService';
import { initSubscription } from '@/services/subscriptionService';

export const useAIAuth = () => {
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);

    const checkAndPrepareAI = async () => {
        try {
            const user = await getCurrentUser();

            if (!user) {
                // Not logged in - show auth modal
                setAuthModalOpen(true);
                return false;
            }

            // Logged in - fetch/sync fresh subscription
            const sub = await initSubscription();
            setSubscription(sub);
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            // Fallback: If network fails, allow if local cache exists, 
            // but for security it's better to return false.
            return false;
        }
    };

    return {
        authModalOpen,
        setAuthModalOpen,
        subscription,
        checkAndPrepareAI
    };
};
