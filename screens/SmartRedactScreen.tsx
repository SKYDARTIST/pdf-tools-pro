import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileUp, Zap, Check, ShieldAlert, Loader2, Download, Eye, EyeOff } from 'lucide-react';
import { askGemini } from '../services/aiService';
import { extractTextFromPdf } from '../utils/pdfExtractor';

const SmartRedactScreen: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'processing' | 'done'>('idle');
    const [redactedContent, setRedactedContent] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const [localSanitizationStats, setLocalSanitizationStats] = useState({ emails: 0, phones: 0 });

    const localRegexSanitize = (text: string) => {
        let sanitized = text;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;

        const emailMatches = text.match(emailRegex) || [];
        const phoneMatches = text.match(phoneRegex) || [];

        setLocalSanitizationStats({
            emails: emailMatches.length,
            phones: phoneMatches.length
        });

        sanitized = sanitized.replace(emailRegex, '[LOCAL_REDACTED_EMAIL]');
        sanitized = sanitized.replace(phoneRegex, '[LOCAL_REDACTED_PHONE]');

        return sanitized;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('ready');
        }
    };

    const startRedaction = async () => {
        if (!file) return;
        setStatus('scanning');
        try {
            const buffer = await file.arrayBuffer();
            const text = await extractTextFromPdf(buffer);

            setStatus('processing');
            const sanitizedText = localRegexSanitize(text);

            const response = await askGemini(
                "Continue the redaction process. This text has already been filtered locally for emails and phone numbers. Now find and redact all remaining PII including addresses, SSNs, credit card numbers, and full names. Replace them with [NEURAL_REDACTED]. Return the full text.",
                sanitizedText,
                "redact"
            );
            setRedactedContent(response);
            setStatus('done');
        } catch (error) {
            console.error("Redaction Failed:", error);
            setStatus('ready');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen pb-32 pt-32 max-w-2xl mx-auto px-6"
        >
            <div className="space-y-12">
                <div className="space-y-3">
                    <div className="text-technical">Protocol Assets / Security Layer</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Smart Redact</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Automated PII Neutralization via Neural Pattern Recognition
                    </p>
                </div>

                {!file ? (
                    <label className="monolith-card h-80 flex flex-col items-center justify-center cursor-pointer group">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                        >
                            <Shield size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest">Inhibit Sensitive Flow</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="space-y-6">
                        <div className="monolith-card p-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center">
                                    <ShieldAlert size={20} className="text-black dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-[12px] font-black uppercase tracking-widest">{file.name}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Target Asset Ready</p>
                                </div>
                            </div>
                            {status === 'ready' && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startRedaction}
                                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Initiate Redaction
                                </motion.button>
                            )}
                        </div>

                        {status === 'scanning' || status === 'processing' ? (
                            <div className="monolith-card p-12 flex flex-col items-center justify-center space-y-6 text-center">
                                <Loader2 size={40} className="animate-spin text-black dark:text-white opacity-20" />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-black uppercase tracking-widest">Neural Scanning In Progress</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Identifying PII vectors for neutralization...</p>
                                </div>
                            </div>
                        ) : status === 'done' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="monolith-card p-10 bg-emerald-500/5 border-emerald-500/10 border flex flex-col items-center text-center space-y-6">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500">
                                        <Check size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-emerald-500">Document Sanitized</h3>
                                        <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">All identified PII has been neutralized from the output stream.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {showPreview ? "Hide Preview" : "Show Preview"}
                                        </button>
                                        <button className="px-6 py-3 bg-white/10 dark:bg-black/10 text-black dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-black/5 dark:border-white/5">
                                            <Download size={14} />
                                            Export Sanitized
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showPreview && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="monolith-card p-8 bg-gray-50 dark:bg-[#0a0a0a] min-h-[400px] overflow-y-auto max-h-[600px] custom-scrollbar">
                                                <pre className="text-[12px] leading-relaxed text-gray-800 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                                    {redactedContent}
                                                </pre>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SmartRedactScreen;
