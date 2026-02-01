
import React from 'react';
import { motion } from 'framer-motion';

interface NeuralPulseProps {
    color?: string;
    size?: 'sm' | 'md' | 'lg';
}

const NeuralPulse: React.FC<NeuralPulseProps> = ({ color = 'bg-emerald-500', size = 'md' }) => {
    const sizeMap = {
        sm: 'w-1 h-1',
        md: 'w-1.5 h-1.5',
        lg: 'w-2 h-2'
    };

    const glowColor = color.includes('emerald') ? 'rgba(16, 185, 129, 0.5)' : 'rgba(139, 92, 246, 0.5)';

    return (
        <div className="relative flex items-center justify-center">
            {/* Outer Glow Ring */}
            <motion.div
                animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.5, 0.1, 0.5],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={`${sizeMap[size]} rounded-full ${color} absolute`}
                style={{ filter: `blur(4px)` }}
            />

            {/* Core Pulse */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={`${sizeMap[size]} rounded-full ${color} relative z-10`}
                style={{ boxShadow: `0 0 8px ${glowColor}` }}
            />
        </div>
    );
};

export default NeuralPulse;
