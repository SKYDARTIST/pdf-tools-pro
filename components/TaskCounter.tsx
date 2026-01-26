import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Crown, Sparkles } from 'lucide-react';
import TaskLimitManager from '../utils/TaskLimitManager';
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

    if (isPro) {
        if (variant === 'header') {
            return (
                <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0"
                    >
                        <Crown size={12} fill="currentColor" className="text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 whitespace-nowrap">
                            PRO ACTIVE
                        </span>
                    </motion.div>

                    {aiCredits > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/10 border border-[#00C896]/20 rounded-full shrink-0 shadow-[0_0_15px_rgba(0,200,150,0.1)]"
                        >
                            <Sparkles size={11} className="text-[#00C896]" fill="currentColor" />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-[#00C896] whitespace-nowrap">
                                {aiCredits}
                            </span>
                        </motion.div>
                    )}
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
                    <Crown size={20} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-black uppercase tracking-widest text-emerald-400">PRO AUTHORIZATION</span>
                    <span className="text-[8px] font-mono font-bold text-emerald-500/50 uppercase tracking-[0.2em] mt-0.5 whitespace-nowrap truncate">UNLIMITED ACCESS</span>
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${isCritical
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-sm shadow-rose-500/10'
                    : isWarning
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-gray-400'
                    }`}
            >
                <Activity size={12} strokeWidth={3} />
                <span className="text-[10px] font-black tracking-tight uppercase">
                    {used}/{limit}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-4 px-6 py-4 rounded-[24px] border transition-all ${isCritical
                ? 'bg-rose-500/5 border-rose-500/20'
                : isWarning
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 shadow-sm'
                }`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isCritical ? 'bg-rose-500/20 text-rose-500' : 'bg-black/10 dark:bg-white/10 text-gray-400'
                    }`}>
                    <Activity size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none">
                        {used} / {limit} TASKS CONSUMED
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                        <NeuralPulse
                            color={isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}
                            size="sm"
                        />
                        <span className="text-[8px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                            SYNC STATUS: {isCritical ? 'EXHAUSTED' : 'OPERATIONAL'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
                <div className={`text-[16px] font-black tracking-tighter leading-none ${isCritical ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
                    {remaining}
                </div>
                <div className="text-[7px] font-mono font-black uppercase tracking-widest text-gray-400 leading-none">
                    REMAINING
                </div>
            </div>
        </motion.div>
    );
};

export default TaskCounter;
