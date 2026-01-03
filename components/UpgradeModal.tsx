import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, Shield, Sparkles, Check } from 'lucide-react';
import TaskLimitManager from '../utils/TaskLimitManager';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason?: 'limit_reached' | 'upgrade_prompt';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    reason = 'upgrade_prompt'
}) => {
    const remaining = TaskLimitManager.getRemainingTasks();
    const limit = TaskLimitManager.getDailyLimit();

    const handleUpgrade = () => {
        // TODO: Integrate payment system (Stripe/Paddle)
        // For now, just upgrade locally for testing
        TaskLimitManager.upgradeToPro();
        onClose();
        window.location.reload(); // Refresh to update UI
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    >
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0a0a] rounded-[40px] overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-[#0a0a0a] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
                            >
                                <X size={20} className="text-slate-600 dark:text-gray-400" />
                            </button>

                            {/* Header */}
                            <div className="relative p-10 pb-8 bg-black text-white dark:bg-white dark:text-black overflow-hidden group">
                                {/* Technical Grid Overlay */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                                <motion.div
                                    animate={{
                                        y: [0, -5, 0],
                                        filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-16 h-16 mx-auto mb-6 bg-white/10 dark:bg-black/10 rounded-2xl flex items-center justify-center relative z-10"
                                >
                                    <Crown size={32} className="text-white dark:text-black" fill="currentColor" />
                                </motion.div>

                                <div className="relative z-10">
                                    {reason === 'limit_reached' ? (
                                        <>
                                            <h2 className="text-3xl font-black text-center uppercase tracking-tighter leading-none mb-3">
                                                Quota Limit
                                            </h2>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 text-center">
                                                Standard Access Exhausted
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="text-3xl font-black text-center uppercase tracking-tighter leading-none mb-3">
                                                Anti-Gravity Pro
                                            </h2>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 text-center">
                                                Initialize Full Protocol
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-6">
                                {/* Pricing */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white">$2.99</span>
                                        <span className="text-sm font-bold text-slate-400 dark:text-gray-600">one-time</span>
                                    </div>
                                    <p className="text-xs font-bold text-violet-600 dark:text-violet-500">
                                        Lifetime access • No subscription
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="space-y-4">
                                    <Feature icon={Zap} text="Unlimited Daily Tasks" />
                                    <Feature icon={Sparkles} text="All 14 Neural Tools" />
                                    <Feature icon={Shield} text="100% Private Processing" />
                                    <Feature icon={Check} text="Zero Ads • Zero Watermarks" />
                                </div>

                                {/* Comparison Card */}
                                <div className="p-8 bg-black/5 dark:bg-white/5 rounded-[32px] space-y-4 border border-black/[0.03] dark:border-white/[0.03]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Standard Apps</span>
                                        <span className="text-xs font-black text-red-500 uppercase tracking-tighter">$100/YEAR</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-black dark:text-white">Anti-Gravity</span>
                                        <span className="text-sm font-black text-emerald-500 uppercase tracking-tighter">$2.99 LIFETIME</span>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="space-y-4 pt-4">
                                    <button
                                        onClick={handleUpgrade}
                                        className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 transition-all relative overflow-hidden group"
                                    >
                                        <motion.div
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
                                        />
                                        Authorize Access - $2.99
                                    </button>

                                    {reason === 'limit_reached' && (
                                        <button
                                            onClick={onClose}
                                            className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-black dark:hover:text-white transition-colors"
                                        >
                                            Stay on Standard Protocol
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const Feature: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-black dark:text-white" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 dark:text-white">{text}</span>
    </div>
);

export default UpgradeModal;
