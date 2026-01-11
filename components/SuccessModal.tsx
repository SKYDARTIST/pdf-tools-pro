import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, TrendingDown, FileText, X, FolderOpen, Share2, Zap, Download } from 'lucide-react';
import { formatFileSize } from '../utils/formatters';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    operation: string;
    fileName: string;
    originalSize?: number;
    finalSize?: number;
    onViewFiles?: () => void;
    metadata?: {
        pagesRemoved?: number;
        pagesSplit?: number;
        imagesConverted?: number;
    };
    onDownload?: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    operation,
    fileName,
    originalSize,
    finalSize,
    onViewFiles,
    metadata,
    onDownload
}) => {
    // Auto-dismiss after 5 seconds
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    const savings = originalSize && finalSize
        ? Math.round((1 - finalSize / originalSize) * 100)
        : 0;

    const showConfetti = savings > 50;

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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-black rounded-[40px] p-10 max-w-sm w-full border-none shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(255,255,255,0.05)] relative overflow-hidden"
                        >
                            {/* Confetti effect for big savings */}
                            {showConfetti && (
                                <div className="absolute inset-0 pointer-events-none">
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ y: -20, x: Math.random() * 300, opacity: 1 }}
                                            animate={{
                                                y: 400,
                                                x: Math.random() * 300,
                                                rotate: Math.random() * 360,
                                                opacity: 0
                                            }}
                                            transition={{
                                                duration: 2,
                                                delay: Math.random() * 0.5,
                                                ease: "easeOut"
                                            }}
                                            className="absolute w-2 h-2 rounded-full"
                                            style={{
                                                backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 5]
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-[#0a0a0a] rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400 dark:text-slate-500" />
                            </button>

                            {/* Success icon with Neural Pulse */}
                            <div className="relative mb-12 flex justify-center">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 4 }}
                                    className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl"
                                />
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="w-24 h-24 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl relative z-10 neural-glow"
                                >
                                    <CheckCircle size={44} />
                                </motion.div>
                            </div>

                            {/* Title */}
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white text-center uppercase tracking-tighter leading-none mb-3">
                                Protocol Success
                            </h3>
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 text-center uppercase tracking-[0.25em] mb-10">
                                Asset Transformation Evaluated
                            </p>

                            {/* File info */}
                            <div className="bg-black/5 dark:bg-white/5 rounded-3xl p-6 mb-8 border border-black/5 dark:border-white/5">
                                <div className="flex items-start gap-3">
                                    <FileText size={20} className="text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest truncate">
                                            {fileName}
                                        </p>

                                        {/* Size comparison */}
                                        {originalSize && finalSize && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">Original:</span>
                                                    <span className="font-bold text-slate-600 dark:text-slate-300">
                                                        {formatFileSize(originalSize)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">Final:</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {formatFileSize(finalSize)}
                                                    </span>
                                                </div>
                                                {savings > 0 && (
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                                                        <Zap size={14} className="text-gray-900 dark:text-white" fill="currentColor" />
                                                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                                            {savings}% Compression Achieved
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Metadata */}
                                        {metadata && (
                                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2a2a2a]">
                                                {metadata.pagesRemoved !== undefined && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                                        Removed {metadata.pagesRemoved} page{metadata.pagesRemoved !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                                {metadata.pagesSplit !== undefined && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                                        Split into {metadata.pagesSplit} file{metadata.pagesSplit !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                                {metadata.imagesConverted !== undefined && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                                        Converted {metadata.imagesConverted} image{metadata.imagesConverted !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                {onDownload && (
                                    <button
                                        onClick={onDownload}
                                        className="w-full flex items-center justify-center gap-3 py-5 px-6 bg-emerald-500 text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105 active:scale-95"
                                    >
                                        <Share2 size={20} />
                                        SHARE ASSET
                                    </button>
                                )}
                                <div className="flex gap-3">
                                    {onViewFiles && (
                                        <button
                                            onClick={onViewFiles}
                                            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            <FolderOpen size={16} />
                                            ARCHIVE
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-4 px-6 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-full font-black text-[10px] uppercase tracking-widest transition-all"
                                    >
                                        DISMISS
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal;
