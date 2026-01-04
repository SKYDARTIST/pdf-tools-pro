import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldAlert, Cpu } from 'lucide-react';

interface NeuralCoolingUIProps {
    isVisible: boolean;
    onComplete: () => void;
}

const NeuralCoolingUI: React.FC<NeuralCoolingUIProps> = ({ isVisible, onComplete }) => {
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        let timer: any;
        if (isVisible && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            onComplete();
            setCountdown(15); // Reset for next time
        }
        return () => clearInterval(timer);
    }, [isVisible, countdown, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6"
                >
                    {/* Cyberpunk Grid Background */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="monolith-card max-w-md w-full p-12 text-center border-emerald-500/30 relative overflow-hidden"
                    >
                        {/* Pulsing Core */}
                        <div className="flex justify-center mb-10 relative">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.6, 0.3]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl"
                            />
                            <div className="w-24 h-24 rounded-3xl bg-black dark:bg-white flex items-center justify-center relative z-10 shadow-2xl">
                                <Cpu size={40} className="text-emerald-500 animate-pulse" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-white dark:text-black uppercase tracking-tighter leading-none">
                                Synapse Overload
                            </h2>
                            <div className="flex items-center justify-center gap-2">
                                <ShieldAlert size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Neural Link Cooling Protocols</span>
                            </div>

                            <p className="text-[12px] font-medium text-gray-400 dark:text-gray-600 leading-relaxed pt-4">
                                Global traffic surge detected. Calibrating neural pathways for maximum data integrity. Your intelligence session is in a safe queue.
                            </p>
                        </div>

                        {/* Progress/Countdown */}
                        <div className="mt-12 space-y-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Cooling Optimization</span>
                                <span className="text-xl font-black tabular-nums tracking-tighter text-emerald-500">{countdown}s</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 dark:bg-black/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(countdown / 15) * 100}%` }}
                                    transition={{ duration: 1, ease: "linear" }}
                                    className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                />
                            </div>
                        </div>

                        <div className="mt-10 flex items-center justify-center gap-4 py-3 px-6 bg-black/20 dark:bg-white/10 rounded-2xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Re-Establishing Secure Uplink</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NeuralCoolingUI;
