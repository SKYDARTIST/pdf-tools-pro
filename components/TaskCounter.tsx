import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Crown } from 'lucide-react';
import TaskLimitManager from '../utils/TaskLimitManager';
import NeuralPulse from './NeuralPulse';

const TaskCounter: React.FC = () => {
    const used = TaskLimitManager.getUsedTasks();
    const limit = TaskLimitManager.getDailyLimit();
    const isPro = TaskLimitManager.isPro();
    const remaining = TaskLimitManager.getRemainingTasks();

    if (isPro) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"
            >
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500">
                    <Crown size={16} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">PRO AUTHORIZATION</span>
                    <span className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-[0.2em]">UNLIMITED NEURAL OVERRIDE</span>
                </div>
            </motion.div>
        );
    }

    const percentage = (used / limit) * 100;
    const isCritical = remaining === 0;
    const isWarning = remaining === 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-4 px-6 py-4 rounded-[24px] border transition-all ${isCritical
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : isWarning
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5'
                }`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isCritical ? 'bg-rose-500/20 text-rose-500' : 'bg-black/10 dark:bg-white/10 text-gray-400'
                    }`}>
                    <Activity size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                        {used} / {limit} TASKS CONSUMED
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                        <NeuralPulse
                            color={isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}
                            size="sm"
                        />
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                            DAILY SYNC STATUS: {isCritical ? 'EXHAUSTED' : 'OPERATIONAL'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
                <div className="text-[14px] font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                    {remaining}
                </div>
                <div className="text-[7px] font-black uppercase tracking-widest text-gray-400">
                    REMAINING
                </div>
            </div>
        </motion.div>
    );
};

export default TaskCounter;
