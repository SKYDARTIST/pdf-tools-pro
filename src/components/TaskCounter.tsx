import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Crown, Sparkles } from 'lucide-react';
import TaskLimitManager from '@/utils/TaskLimitManager';
import NeuralPulse from './NeuralPulse';

interface TaskCounterProps {
    variant?: 'header' | 'inline';
    onUpgradeClick?: () => void;
}

const TaskCounter: React.FC<TaskCounterProps> = ({ variant = 'inline', onUpgradeClick }) => {
    const used = TaskLimitManager.getUsedTasks();
    const limit = TaskLimitManager.getDailyLimit();
    const isPro = TaskLimitManager.isPro();
    const remaining = TaskLimitManager.getRemainingTasks();

    const subscription = TaskLimitManager.getSubscriptionSync();
    const aiCredits = subscription?.aiPackCredits || 0;

    const isLifetime = subscription?.tier === 'lifetime';

    if (isPro || isLifetime) {
        if (variant === 'header') {
            return (
                <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onUpgradeClick}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0 cursor-pointer hover:bg-emerald-500/20 transition-all"
                    >
                        <Crown size={12} fill="currentColor" className="text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 whitespace-nowrap">
                            LIFETIME ACTIVE
                        </span>
                    </motion.div>
                </div>
            );
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="monolith-glass p-6 items-center flex gap-4 bg-black/60 text-white border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-[32px] overflow-hidden relative group"
            >
                <motion.div
                    animate={{ x: ['-200%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent skew-x-12"
                />
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shrink-0 shadow-lg border border-emerald-500/20">
                    {isLifetime ? <Sparkles size={20} className="text-emerald-500" /> : <Crown size={20} fill="currentColor" />}
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-black uppercase tracking-widest text-emerald-400">
                        LIFETIME AUTHORIZATION
                    </span>
                    <span className="text-[8px] font-mono font-bold text-emerald-500/50 uppercase tracking-[0.2em] mt-0.5 whitespace-nowrap truncate">
                        UNLIMITED LIFETIME ACCESS
                    </span>
                </div>
            </motion.div>
        );
    }

    const percentage = (used / limit) * 100;
    const isCritical = remaining === 0;
    const isWarning = remaining === 1;

    if (variant === 'header') {
        return (
            <motion.div
                onClick={onUpgradeClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
                <Sparkles size={10} className="animate-pulse" />
                <span className="text-[9px] font-black tracking-tight uppercase">
                    UNLOCK LIFETIME
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="monolith-glass p-6 items-center flex gap-4 bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden"
        >
            <div className="w-10 h-10 bg-black/10 dark:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                <Activity size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-[11px] font-mono font-black uppercase tracking-widest text-gray-500">
                    BASE UTILITY ACTIVE
                </span>
                <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">
                    UNLIMITED PDF TOOLS • FREE TIER
                </span>
            </div>
        </motion.div>
    );
};

// PERFORMANCE: Memoize to prevent unnecessary re-renders
export default React.memo(TaskCounter, (prevProps, nextProps) => {
    // Only re-render if props actually changed
    return prevProps.variant === nextProps.variant &&
           prevProps.onUpgradeClick === nextProps.onUpgradeClick;
});
