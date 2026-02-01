import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileUp, Zap, Check, ShieldAlert, Loader2, Share2, Eye, EyeOff, User, Mail, CreditCard, Fingerprint } from 'lucide-react';
import { askGemini } from '@/services/aiService';
import { extractTextFromPdf } from '@/utils/pdfExtractor';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '@/services/subscriptionService';
import AiLimitModal from '@/components/AiLimitModal';
import ToolGuide from '@/components/ToolGuide';
import NeuralCoolingUI from '@/components/NeuralCoolingUI';
import AIOptInModal from '@/components/AIOptInModal';
import AIReportModal from '@/components/AIReportModal';
import { Flag } from 'lucide-react';
import { downloadFile } from '@/services/downloadService';
import SuccessModal from '@/components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '@/utils/imageProcessor';
import { createPdfFromText } from '@/services/pdfService';

const SmartRedactScreen: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'processing' | 'done'>('idle');
    const [redactedContent, setRedactedContent] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);

    const [localSanitizationStats, setLocalSanitizationStats] = useState({ emails: 0, phones: 0 });
    const [filters, setFilters] = useState({
        identity: true,
        financial: true,
        contact: true,
        identifiers: true
    });
    const [isCooling, setIsCooling] = useState(false);
    const [showAiLimit, setShowAiLimit] = useState(false);
    const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any }>({ blockMode: null });
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);
    const navigate = useNavigate();

    const toggleFilter = (key: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            try {
                const arrayBuffer = await f.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: f.type });
                const freshFile = new File([blob], f.name, { type: f.type });
                setFile(freshFile);
                setStatus('ready');
                setRedactedContent('');
                setShowPreview(false);
            } catch (err) {
                console.error('Failed to read file:', f.name, err);
                alert('Failed to read file. Please try again.');
            }
        }
    };

    const handleExport = async (format: 'txt' | 'pdf' | 'image') => {
        if (!redactedContent) return;
        const fileName = `sanitized_${file?.name.split('.')[0]}`;

        if (format === 'txt') {
            const blob = new Blob([redactedContent], { type: 'text/plain' });
            await downloadFile(blob, `${fileName}.txt`);
            setSuccessData({
                isOpen: true,
                fileName: `${fileName}.txt`,
                originalSize: file?.size || 0,
                finalSize: blob.size
            });
        } else if (format === 'pdf') {
            await exportToPdf(redactedContent, fileName);
        } else if (format === 'image') {
            await exportToImage(redactedContent, fileName);
        }
    };

    const exportToPdf = async (text: string, fileName: string) => {
        try {
            const pdfBytes = await createPdfFromText("Sanitized Document Report", text);
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            await downloadFile(blob, `${fileName}.pdf`);
            setSuccessData({
                isOpen: true,
                fileName: `${fileName}.pdf`,
                originalSize: file?.size || 0,
                finalSize: pdfBytes.length
            });
        } catch (error) {
            console.error("PDF Export Failed:", error);
            alert("Neural PDF engine failed to compile the report. Please try the 'Text' or 'Image' export option.");
        }
    };

    const exportToImage = async (text: string, fileName: string) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const padding = 60;
        const fontSize = 14;
        const lineHeight = 20;
        const width = 800;

        ctx.font = `${fontSize}px monospace`;
        const lines: string[] = [];
        const words = text.split('\n');

        words.forEach(paragraph => {
            const pWords = paragraph.split(' ');
            let currentLine = "";
            pWords.forEach(word => {
                const testLine = currentLine + word + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > width - padding * 2) {
                    lines.push(currentLine);
                    currentLine = word + " ";
                } else {
                    currentLine = testLine;
                }
            });
            lines.push(currentLine);
        });

        canvas.width = width;
        canvas.height = lines.length * lineHeight + padding * 2;
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111827';
        ctx.font = `${fontSize}px monospace`;
        lines.forEach((line, i) => {
            ctx.fillText(line, padding, padding + i * lineHeight);
        });

        const url = canvas.toDataURL('image/png');
        const blob = await (await fetch(url)).blob();
        await downloadFile(blob, `${fileName}.png`);
        setSuccessData({
            isOpen: true,
            fileName: `${fileName}.png`,
            originalSize: file?.size || 0,
            finalSize: blob.size
        });
    };

    const startRedaction = async () => {
        if (!file) return;

        if (!hasConsent) {
            setShowConsent(true);
            return;
        }

        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const subscription = getSubscription();
            setAiLimitInfo({
                blockMode: aiCheck.blockMode,
            });
            setShowAiLimit(true);
            return;
        }

        setStatus('scanning');
        try {
            let contentToProcess = "";
            let imageBase64: string | undefined = undefined;

            if (file.type === 'application/pdf') {
                const buffer = await file.arrayBuffer();
                contentToProcess = await extractTextFromPdf(buffer.slice(0));

                if (!contentToProcess || contentToProcess.trim() === '') {
                    const { renderPageToImage } = await import('@/utils/pdfExtractor');
                    const imageRaw = await renderPageToImage(buffer.slice(0), 1);
                    imageBase64 = imageRaw;
                    contentToProcess = "[SCANNED DOCUMENT DETECTED]";
                }
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const rawBase64 = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                imageBase64 = await compressImage(rawBase64);
            }

            setStatus('processing');
            const sanitizedText = file.type === 'application/pdf' ? localRegexSanitize(contentToProcess) : contentToProcess;

            let categoriesToRedact = "";
            if (filters.identity) categoriesToRedact += "full names, dates of birth, social security numbers, ";
            if (filters.financial) categoriesToRedact += "bank account numbers, credit card details, financial balances, transactions, ";
            if (filters.contact) categoriesToRedact += "home addresses, personal phone numbers, emails, ";
            if (filters.identifiers) categoriesToRedact += "Passport numbers, Voter ID details, License numbers, ";

            const prompt = `Redact sensitive data: ${categoriesToRedact} Replace with [REDACTED]. Return cleaned text only.`;

            const response = await askGemini(prompt, sanitizedText, "redact", imageBase64);

            if (!response.success || !response.data) {
                if (response.error?.includes('AI_RATE_LIMIT')) {
                    setIsCooling(true);
                } else {
                    alert(response.error || "Redaction failed. Credit NOT deducted.");
                }
                setStatus('ready');
                return;
            }

            const finalSanitized = localRegexSanitize(response.data);
            setRedactedContent(finalSanitized);
            await recordAIUsage(AiOperationType.HEAVY);
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
                    <div className="text-technical">AI Tools / Smart Redact</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Smart Redact</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                        Automatically hide sensitive info like names, emails, and bank details
                    </p>
                </div>

                {!file ? (
                    <label className="monolith-card h-80 flex flex-col items-center justify-center cursor-pointer group">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl mb-6"
                        >
                            <Shield size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Drag & Drop or Click to Open PDF/Image</span>
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : null}

                {!file && (
                    <ToolGuide
                        title="How Smart Redact works"
                        description="Automatically find and hide sensitive personal information from documents and images using advanced AI security layers."
                        steps={[
                            "Upload a PDF or an Image with sensitive data.",
                            "Select the types of info you want to hide.",
                            "Tap 'Redact' to start the AI scanning process.",
                            "Download your private, cleaned document."
                        ]}
                        useCases={[
                            "ID Cards", "Bank Statements", "Hiding Personal Info", "Public Records", "Privacy Compliance"
                        ]}
                    />
                )}

                {file && (
                    <div className="space-y-6">
                        <div className="monolith-card p-8 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                                    <ShieldAlert size={20} className="text-black dark:text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest truncate">Active Document</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {file.type.startsWith('image/') ? 'Image File' : 'PDF File'}
                                    </p>
                                </div>
                            </div>
                            {status === 'ready' && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startRedaction}
                                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest"
                                >
                                    <span>Redact</span>
                                </motion.button>
                            )}
                        </div>

                        {status === 'ready' && (
                            <div className="monolith-card p-6 space-y-6">
                                <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Choose what to hide</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['identity', 'financial', 'contact', 'identifiers'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => toggleFilter(f)}
                                            className={`p-4 rounded-[40px] border-2 flex flex-col gap-3 transition-all ${filters[f] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400'}`}
                                        >
                                            {f === 'identity' && <User size={18} />}
                                            {f === 'financial' && <CreditCard size={18} />}
                                            {f === 'contact' && <Mail size={18} />}
                                            {f === 'identifiers' && <Fingerprint size={18} />}
                                            <span className="text-[9px] font-black uppercase tracking-widest">{f}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {status === 'scanning' || status === 'processing' ? (
                            <div className="monolith-card p-12 flex flex-col items-center justify-center space-y-6 text-center">
                                <Loader2 size={40} className="animate-spin text-black dark:text-white opacity-20" />
                                <h4 className="text-sm font-black uppercase tracking-widest">Scanning your document...</h4>
                            </div>
                        ) : status === 'done' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="monolith-card p-10 bg-emerald-500/5 border-emerald-500/10 border flex flex-col items-center text-center space-y-6 rounded-[40px]">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                                        <Check size={32} />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-emerald-500">Privacy Clean Complete</h3>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <button onClick={() => setShowPreview(!showPreview)} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {showPreview ? "Hide Preview" : "Show Preview"}
                                        </button>
                                        {(['txt', 'pdf', 'image'] as const).map(format => (
                                            <button key={format} onClick={() => handleExport(format)} className="px-4 py-3 bg-white/10 dark:bg-black/10 text-black dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-black/5 dark:border-white/5 hover:bg-emerald-500 hover:text-white transition-all">
                                                <Share2 size={14} />
                                                {format.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showPreview && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
            <NeuralCoolingUI isVisible={isCooling} onComplete={() => setIsCooling(false)} />
            <AiLimitModal
                isOpen={showAiLimit}
                onClose={() => setShowAiLimit(false)}
                blockMode={aiLimitInfo.blockMode}
                used={aiLimitInfo.used}
                limit={aiLimitInfo.limit}
            />
            <AIOptInModal
                isOpen={showConsent}
                onClose={() => setShowConsent(false)}
                onAccept={() => {
                    localStorage.setItem('ai_neural_consent', 'true');
                    setHasConsent(true);
                    setShowConsent(false);
                    startRedaction();
                }}
            />
            <AIReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
            {successData && (
                <SuccessModal
                    isOpen={successData.isOpen}
                    onClose={() => setSuccessData(null)}
                    data={{ fileName: successData.fileName, originalSize: successData.originalSize, finalSize: successData.finalSize }}
                />
            )}
        </motion.div>
    );
};

export default SmartRedactScreen;
