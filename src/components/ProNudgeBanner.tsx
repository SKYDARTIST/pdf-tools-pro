/**
 * ProNudgeBanner - Soft, non-blocking upgrade prompt
 * Shows only to free-tier users. Never blocks anything.
 * 
 * Variants:
 * - 'success': After successful tool use (inside SuccessModal)
 * - 'ai': After AI analysis (inline in workspace)
 * - 'retention': After 7+ days of usage (HomeScreen)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSubscription, SubscriptionTier } from '@/services/subscriptionService';
import Analytics from '@/services/analyticsService';

type NudgeVariant = 'success' | 'ai' | 'retention';

interface ProNudgeBannerProps {
    variant: NudgeVariant;
    onDismiss?: () => void;
}

const NUDGE_COPY: Record<NudgeVariant, { text: string; cta: string }> = {
    success: {
        text: 'Pro users also get Sign, Scanner, AI Reader & 12 more tools',
        cta: 'See Pro — $4.99 forever',
    },
    ai: {
        text: 'Pro Pack unlocks Neural Reader with unlimited AI chat, outlines & mind maps',
        cta: 'Unlock Pro — $4.99',
    },
    retention: {
        text: 'You\'ve been using Anti-Gravity for over a week. Unlock all tools forever.',
        cta: 'Get Pro — $4.99',
    },
};

const DISMISS_KEY = 'ag_nudge_dismissed';

const ProNudgeBanner: React.FC<ProNudgeBannerProps> = ({ variant, onDismiss }) => {
    const navigate = useNavigate();
    const subscription = getSubscription();

    // Never show to paying users
    if (subscription.tier !== SubscriptionTier.FREE && subscription.tier) {
        return null;
    }

    // Check retention variant: only show after 7 days
    if (variant === 'retention') {
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed) return null;

        const firstOpen = localStorage.getItem('ag_first_open');
        if (!firstOpen) {
            localStorage.setItem('ag_first_open', Date.now().toString());
            return null;
        }
        const daysSinceInstall = (Date.now() - parseInt(firstOpen)) / (1000 * 60 * 60 * 24);
        if (daysSinceInstall < 7) return null;
    }

    const copy = NUDGE_COPY[variant];

    const handleCTA = () => {
        Analytics.track('nudge_tap', { variant });
        navigate('/pricing');
    };

    const handleDismiss = () => {
        if (variant === 'retention') {
            localStorage.setItem(DISMISS_KEY, 'true');
        }
        Analytics.track('nudge_dismiss', { variant });
        onDismiss?.();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 rounded-2xl border border-[#00C896]/20 bg-[#00C896]/5 dark:bg-[#00C896]/10 p-4"
        >
            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide leading-relaxed mb-3">
                {copy.text}
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleCTA}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-white rounded-full text-[9px] font-black uppercase tracking-[0.15em] hover:brightness-110 active:scale-95 transition-all"
                >
                    {copy.cta}
                    <ArrowRight size={10} />
                </button>
                {variant === 'retention' && (
                    <button
                        onClick={handleDismiss}
                        className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                        Later
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default ProNudgeBanner;
