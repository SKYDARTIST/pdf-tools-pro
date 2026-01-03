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
        <>
            {statCards.map((card) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        delay: card.delay,
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                    }}
                    whileHover={{ y: -4 }}
                    className="monolith-card p-6 flex flex-col justify-between aspect-square sm:aspect-auto sm:h-40"
                >
                    <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/5">
                        <card.icon size={18} className="text-gray-900 dark:text-white" />
                    </div>

                    <div>
                        <div className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white leading-none mb-1">
                            {card.value}
                        </div>
                        <div className="text-technical">
                            {card.label}
                        </div>
                    </div>
                </motion.div>
            ))}
        </>
    );
};

export default UsageStats;
