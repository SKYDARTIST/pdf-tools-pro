import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertCircle, XCircle, X } from 'lucide-react';

interface AiPackNotificationProps {
    message: string | null;
    type: 'milestone' | 'warning' | 'exhausted' | null;
    onClose: () => void;
}

const AiPackNotification: React.FC<AiPackNotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        if (message && type !== 'exhausted') {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message, type, onClose]);

    if (!message) return null;

    const colors = {
        milestone: 'bg-black dark:bg-white text-white dark:text-black border-white/10 dark:border-black/10',
        warning: 'bg-amber-500 text-white border-amber-400',
        exhausted: 'bg-rose-600 text-white border-rose-500'
    };

    const icons = {
        milestone: <Zap size={18} fill="currentColor" />,
        warning: <AlertCircle size={18} />,
        exhausted: <XCircle size={18} />
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`fixed bottom-24 left-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-4 transition-all ${colors[type || 'milestone']}`}
            >
                <div className="shrink-0">
                    {icons[type || 'milestone']}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest leading-tight">
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
                >
                    <X size={16} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default AiPackNotification;
