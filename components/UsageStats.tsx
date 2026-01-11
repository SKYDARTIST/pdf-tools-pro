import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import FileHistoryManager from '../utils/FileHistoryManager';
import { Zap, Activity } from 'lucide-react';

const UsageStats: React.FC = () => {
    const [stats, setStats] = useState(FileHistoryManager.getStats());

    useEffect(() => {
        setStats(FileHistoryManager.getStats());
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
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="monolith-glass rounded-[32px] p-2 flex items-center justify-around gap-4 border border-black/5 dark:border-white/10"
        >
            {statCards.map((card, i) => (
                <div key={card.label} className="flex items-center gap-4 py-2 px-4">
                    <div className="w-8 h-8 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center">
                        <card.icon size={14} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                            {card.value}
                        </span>
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {card.label}
                        </span>
                    </div>
                    {i === 0 && (
                        <div className="w-px h-8 bg-black/10 dark:bg-white/10 ml-4" />
                    )}
                </div>
            ))}
        </motion.div>
    );
};

export default UsageStats;
