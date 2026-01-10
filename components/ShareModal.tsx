import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Link2, Download, Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { downloadFile } from '../services/downloadService';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    fileData: Uint8Array;
    fileType: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    fileName,
    fileData,
    fileType
}) => {
    const [copied, setCopied] = useState(false);

    const handleWebShare = async () => {
        try {
            // Create a File object from Uint8Array
            const file = new File([fileData], fileName, { type: fileType });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: fileName,
                    text: `Sharing ${fileName}`
                });
            } else {
                // Fallback: download the file
                const blob = new Blob([fileData], { type: fileType });
                await downloadFile(blob, fileName);
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handleEmailShare = () => {
        // Open email client with subject
        window.location.href = `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent('Please find the attached PDF file.')}`;

        // Note: Email clients don't support direct file attachments via mailto
        // Note: Email clients don't support direct file attachments via mailto
        // User will need to manually attach the downloaded file
        setTimeout(async () => {
            const blob = new Blob([fileData], { type: fileType });
            await downloadFile(blob, fileName);
        }, 100);
    };

    const handleCopyLink = async () => {
        // Create a temporary blob URL
        const blob = new Blob([fileData], { type: fileType });
        const url = window.URL.createObjectURL(blob);

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDownload = async () => {
        const blob = new Blob([fileData], { type: fileType });
        await downloadFile(blob, fileName);
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[32px] p-6 w-full sm:max-w-md border-t sm:border border-slate-200 dark:border-[#2a2a2a] shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    Share File
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-[#0a0a0a] rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-400 dark:text-slate-500" />
                                </button>
                            </div>

                            {/* File Info */}
                            <div className="mb-6 p-4 bg-slate-50 dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-[#2a2a2a]">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {fileName}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {(fileData.length / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>

                            {/* Share Options */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {/* Web Share */}
                                <button
                                    onClick={handleWebShare}
                                    className="flex flex-col items-center gap-2 p-4 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-2xl transition-colors border border-violet-200 dark:border-violet-500/20"
                                >
                                    <Share2 size={24} className="text-violet-600 dark:text-violet-400" />
                                    <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                                        Share
                                    </span>
                                </button>

                                {/* Email */}
                                <button
                                    onClick={handleEmailShare}
                                    className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-2xl transition-colors border border-blue-200 dark:border-blue-500/20"
                                >
                                    <Mail size={24} className="text-blue-600 dark:text-blue-400" />
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                        Email
                                    </span>
                                </button>

                                {/* Copy Link */}
                                <button
                                    onClick={handleCopyLink}
                                    className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-2xl transition-colors border border-emerald-200 dark:border-emerald-500/20"
                                >
                                    {copied ? (
                                        <Check size={24} className="text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <Copy size={24} className="text-emerald-600 dark:text-emerald-400" />
                                    )}
                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </span>
                                </button>

                                {/* Download */}
                                <button
                                    onClick={handleDownload}
                                    className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-500/10 hover:bg-slate-100 dark:hover:bg-slate-500/20 rounded-2xl transition-colors border border-slate-200 dark:border-slate-500/20"
                                >
                                    <Download size={24} className="text-slate-600 dark:text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Download
                                    </span>
                                </button>
                            </div>

                            {/* Note */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                                Files are processed locally and never uploaded to any server
                            </p>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ShareModal;
