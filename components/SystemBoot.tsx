import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cpu, Shield, Zap } from 'lucide-react';

const SystemBoot: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [stage, setStage] = useState(0);
    const stages = [
        { label: 'LOADING TOOLS', icon: Cpu },
        { label: 'SECURITY READY', icon: Shield },
        { label: 'AI ASSISTANT READY', icon: Sparkles },
        { label: 'SYSTEM READY', icon: Zap },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStage(prev => {
                if (prev >= stages.length - 1) {
                    clearInterval(timer);
                    setTimeout(onComplete, 500);
                    return prev;
                }
                return prev + 1;
            });
        }, 250);

        return () => clearInterval(timer);
    }, [onComplete, stages.length]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-white select-none pointer-events-none"
        >
            <div className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(white 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px'
                }}
            />

            <div className="relative z-10 flex flex-col items-center gap-12 max-w-[280px] w-full">
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-white/20"
                >
                    <Sparkles size={40} className="text-black" />
                </motion.div>

                <div className="w-full space-y-6">
                    <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            animate={{ width: `${(stage + 1) * 25}%` }}
                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stage}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-3"
                            >
                                {React.createElement(stages[stage].icon, { size: 16, className: "text-gray-500" })}
                                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/80">
                                    {stages[stage].label}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                <span className="text-[10px] font-black tracking-[0.5em] text-white/10 uppercase">v2.1</span>
            </div>
        </motion.div>
    );
};

export default SystemBoot;
