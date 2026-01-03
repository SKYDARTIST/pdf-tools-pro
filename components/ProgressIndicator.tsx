import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
    progress: number; // 0-100
    currentStep: string;
    estimatedTime?: number; // in seconds
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    progress,
    currentStep,
    estimatedTime
}) => {
    const circumference = 2 * Math.PI * 40; // radius = 40
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
            {/* Circular progress */}
            <div className="relative w-32 h-32">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-200 dark:text-[#2a2a2a]"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx="64"
                        cy="64"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="text-violet-600 dark:text-violet-400 transition-all duration-300"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                    />
                </svg>

                {/* Percentage text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>

            {/* Current step */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-violet-600 dark:text-violet-400" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {currentStep}
                    </p>
                </div>

                {/* Estimated time */}
                {estimatedTime !== undefined && estimatedTime > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        About {estimatedTime} second{estimatedTime !== 1 ? 's' : ''} remaining
                    </p>
                )}
            </div>

            {/* Progress bar (alternative linear view) */}
            <div className="w-full max-w-xs">
                <div className="h-2 bg-slate-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-violet-600 to-blue-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProgressIndicator;
