import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crown } from 'lucide-react';
import TaskLimitManager from '../utils/TaskLimitManager';

interface TaskCounterProps {
    onUpgradeClick: () => void;
}

const TaskCounter: React.FC<TaskCounterProps> = ({ onUpgradeClick }) => {
    const [remaining, setRemaining] = useState(TaskLimitManager.getRemainingTasks());
    const [isPro, setIsPro] = useState(TaskLimitManager.isPro());

    useEffect(() => {
        // Update counter every second to catch midnight reset
        const interval = setInterval(() => {
            setRemaining(TaskLimitManager.getRemainingTasks());
            setIsPro(TaskLimitManager.isPro());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Pro users see Pro badge
    if (isPro) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white border border-gray-200 dark:border-white/10 rounded-full shadow-md"
            >
                <Crown size={14} className="text-white dark:text-black" fill="currentColor" />
                <span className="text-[10px] font-black text-white dark:text-black uppercase tracking-wider">Pro</span>
            </motion.div>
        );
    }

    // Free users see task counter
    const limit = TaskLimitManager.getDailyLimit();
    const used = limit - remaining;
    const percentage = (used / limit) * 100;

    return (
        <motion.button
            onClick={onUpgradeClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 px-3 py-1 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-full shadow-sm hover:shadow-md transition-all group shrink-0"
        >
            {/* Progress Ring */}
            <div className="relative w-5 h-5">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-gray-100 dark:text-white/5"
                    />
                    <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - percentage / 100)}`}
                        className={`transition-all duration-500 ${remaining === 0
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-900 dark:text-white'
                            }`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap
                        size={10}
                        className="text-gray-900 dark:text-white"
                        fill="currentColor"
                    />
                </div>
            </div>

            {/* Text */}
            <div className="flex items-center gap-1 leading-none whitespace-nowrap">
                <span className="text-[10px] font-black tracking-tighter text-gray-900 dark:text-white uppercase">
                    {remaining}/{limit}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    TASKS
                </span>
            </div>

            {/* Upgrade hint on hover */}
            <AnimatePresence>
                {remaining <= 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-black dark:bg-white rounded-md shadow-xl"
                    >
                        <span className="text-[8px] font-black text-white dark:text-black uppercase tracking-wider whitespace-nowrap leading-none">
                            Limited
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

export default TaskCounter;
