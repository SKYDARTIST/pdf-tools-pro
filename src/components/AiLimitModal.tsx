import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Crown, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { getSubscription, SubscriptionTier, AiBlockMode } from '@/services/subscriptionService';
import BillingService from '@/services/billingService';
import { useNavigate } from 'react-router-dom';

interface AiLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    blockMode: AiBlockMode;
    used?: number;
    limit?: number;
}

const AiLimitModal: React.FC<AiLimitModalProps> = ({
    isOpen,
    onClose,
    blockMode,
    used = 0,
    limit = 0
}) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const subscription = getSubscription();

    const handleNavigateToPricing = () => {
        onClose();
        navigate('/pricing');
    };

    // Modal content based on block mode
    const getModalContent = () => {
        const isPro = subscription.tier === SubscriptionTier.PRO;

        return {
            icon: isPro ? Sparkles : Crown,
            title: isPro ? 'Monthly Limit Reached' : 'AI Limit Reached',
            subtitle: `${used}/${limit} ${isPro ? 'Pro' : 'Free'} AI Docs Used`,
            description: isPro
                ? "You've reached your monthly allowance. Upgrade to Lifetime for unlimited neural computations."
                : 'Unlock 50 AI documents per month and unlimited PDF tasks with Pro access.',
            primaryAction: {
                label: 'View Plans',
                onClick: handleNavigateToPricing,
                color: isPro ? '#00C896' : 'black'
            },
            secondaryAction: null
        };
    };

    const content = getModalContent();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0a0a] rounded-[32px] sm:rounded-[40px] overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-20 shadow-sm"
                            >
                                <X size={16} className="text-slate-600 dark:text-gray-400" />
                            </button>

                            {/* Header */}
                            <div className="relative p-6 sm:p-10 pb-4 sm:pb-8 bg-black text-white dark:bg-white dark:text-black overflow-hidden shrink-0">
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '15px 15px' }} />

                                <motion.div
                                    animate={{
                                        y: [0, -3, 0],
                                        filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-6 bg-white/10 dark:bg-black/10 rounded-xl sm:rounded-2xl flex items-center justify-center relative z-10"
                                >
                                    {React.createElement(content.icon, {
                                        size: 20,
                                        className: "sm:text-[32px] text-white dark:text-black",
                                        fill: "currentColor"
                                    })}
                                </motion.div>

                                <div className="relative z-10 text-center">
                                    <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-1 sm:mb-3">
                                        {content.title}
                                    </h2>
                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-60">
                                        {content.subtitle}
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-4 sm:space-y-6">
                                {/* Description */}
                                <div className="p-4 sm:p-6 bg-amber-500/10 dark:bg-amber-500/5 rounded-[20px] border border-amber-500/20">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {content.description}
                                        </p>
                                    </div>
                                </div>

                                {/* What's Included */}
                                {subscription.tier === SubscriptionTier.FREE ? (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-600">
                                            Pro Includes:
                                        </h3>
                                        <div className="space-y-2">
                                            <InfoItem text="Unlimited PDF Tasks" />
                                            <InfoItem text="50 AI Docs per Month" />
                                            <InfoItem text="Authoritative Sync" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-600">
                                            Lifetime Includes:
                                        </h3>
                                        <div className="space-y-2">
                                            <InfoItem text="Unlimited AI Documents" />
                                            <InfoItem text="UNLIMITED PDF Tasks" />
                                            <InfoItem text="Own It Forever" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-6 sm:p-8 pt-2 sm:pt-4 bg-white dark:bg-[#0a0a0a] border-t border-black/5 dark:border-white/5 shrink-0">
                                <div className="space-y-3">
                                    {/* Primary action */}
                                    <button
                                        onClick={content.primaryAction.onClick}
                                        disabled={isLoading}
                                        className="w-full py-4 sm:py-6 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 transition-all relative overflow-hidden flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{
                                            backgroundColor: content.primaryAction.color === 'black' ? 'black' : content.primaryAction.color,
                                            color: 'white'
                                        }}
                                    >
                                        <motion.div
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                                        />
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            content.primaryAction.label
                                        )}
                                    </button>

                                    {/* Secondary action (if exists) */}
                                    {content.secondaryAction && (
                                        <button
                                            onClick={content.secondaryAction.onClick}
                                            disabled={isLoading}
                                            className="w-full py-3 rounded-full border-2 border-gray-200 dark:border-white/10 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {content.secondaryAction.label}
                                        </button>
                                    )}

                                    {/* Cancel */}
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="w-full py-1 text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        Maybe Later
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const InfoItem: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">
            {text}
        </span>
    </div>
);

export default AiLimitModal;
