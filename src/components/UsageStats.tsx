import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import FileHistoryManager from '@/utils/FileHistoryManager';
import { Zap, Activity, Sparkles } from 'lucide-react';
import { getSubscription, subscribeToSubscription } from '@/services/subscriptionService';

const UsageStats: React.FC = () => {
    const [stats, setStats] = useState(FileHistoryManager.getStats());
    const [subscription, setSubscription] = useState(getSubscription());

    useEffect(() => {
        const update = () => {
            setStats(FileHistoryManager.getStats());
            setSubscription(getSubscription());
        };

        // Initial load
        update();

        // Listen for subscription updates (from recordAIUsage)
        return subscribeToSubscription(update);
    }, []);

    const statCards = [
        {
            icon: Zap,
            label: 'Ops Completed',
            value: stats.totalFiles.toString(),
            delay: 0.1,
        },
        {
            icon: Activity,
            label: 'Success Rate',
            value: `${stats.successRate || 100}%`,
            delay: 0.2,
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="monolith-card rounded-[40px] p-1.5 flex items-center justify-between gap-1 border border-[#E2E8F0] dark:border-white/10 shadow-sm overflow-hidden"
        >
            {statCards.map((card, i) => (
                <div key={card.label} className="flex flex-1 items-center justify-center gap-2 py-2 px-1 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                        <card.icon size={12} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-lg sm:text-2xl font-black tracking-tighter leading-none truncate text-[#000000] dark:text-white">
                            {card.value}
                        </span>
                        <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#2D3748] dark:text-gray-400 opacity-80 mt-1 truncate">
                            {card.label.split(' ')[0]}
                        </span>
                    </div>
                    {i < statCards.length - 1 && (
                        <div className="w-px h-6 bg-black/10 dark:bg-white/10 ml-1 shrink-0" />
                    )}
                </div>
            ))}
        </motion.div>
    );
};

export default UsageStats;
