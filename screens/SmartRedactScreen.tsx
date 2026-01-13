import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileUp, Zap, Check, ShieldAlert, Loader2, Share2, Eye, EyeOff, User, Mail, CreditCard, Fingerprint } from 'lucide-react';
import { askGemini } from '../services/aiService';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { canUseAI, recordAIUsage } from '../services/subscriptionService';
import UpgradeModal from '../components/UpgradeModal';
import ToolGuide from '../components/ToolGuide';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';
import { downloadFile } from '../services/downloadService';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../utils/imageProcessor';
import { createPdfFromText } from '../services/pdfService';

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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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
                // Read file data immediately to prevent Android permission expiration
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

            // Show success modal
            setSuccessData({
                isOpen: true,
                fileName: `${fileName}.pdf`,
                originalSize: file?.size || 0,
                finalSize: pdfBytes.length
            });
        } catch (error) {
            console.error("PDF Export Failed:", error);
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

        // Draw Background
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Text
        ctx.fillStyle = '#111827';
        ctx.font = `${fontSize}px monospace`;
        lines.forEach((line, i) => {
            ctx.fillText(line, padding, padding + i * lineHeight);
        });

        const url = canvas.toDataURL('image/png');
        const blob = await (await fetch(url)).blob();
        await downloadFile(blob, `${fileName}.png`);

        // Show success modal
        setSuccessData({
            isOpen: true,
            fileName: `${fileName}.png`,
            originalSize: file?.size || 0,
            finalSize: blob.size
        });
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const startRedaction = async () => {
        if (!file) return;

        if (!hasConsent) {
            setShowConsent(true);
            return;
        }

        const aiCheck = canUseAI();
        if (!aiCheck.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        setStatus('scanning');
        try {
            let contentToProcess = "";
            let imageBase64: string | undefined = undefined;

            if (file.type === 'application/pdf') {
                const buffer = await file.arrayBuffer();
                contentToProcess = await extractTextFromPdf(buffer);
            } else if (file.type.startsWith('image/')) {
                const rawBase64 = await fileToBase64(file);
                imageBase64 = await compressImage(rawBase64);
                contentToProcess = "Analyzing image for PII vectors.";
            }

            setStatus('processing');
            const sanitizedText = file.type === 'application/pdf' ? localRegexSanitize(contentToProcess) : contentToProcess;

            let categoriesToRedact = "";
            if (filters.identity) categoriesToRedact += "full names, dates of birth, social security numbers, ";
            if (filters.financial) categoriesToRedact += "bank account numbers, credit card details, financial balances, transactions, ";
            if (filters.contact) categoriesToRedact += "home addresses, personal phone numbers, emails, ";
            if (filters.identifiers) categoriesToRedact += "Passport numbers, Voter ID details, License numbers, any government-issued identifiers, ";

            const filterContext = categoriesToRedact
                ? `You MUST identify and neutralize ONLY the following categories: ${categoriesToRedact.slice(0, -2)}. PRESERVE ALL OTHER DATA EXACTLY AS IT APPEARS. Do NOT redact names or dates if they are not selected in your specific instructions.`
                : "The user has opted for NO specific redaction. Perform a baseline extraction only.";

            const prompt = file.type === 'application/pdf'
                ? `CRITICAL SECURITY PROTOCOL: You are a high-security redaction engine. Your primary objective is to find and neutralize specific data vectors. ${filterContext} Replace selected identifiers with [NEURAL_REDACTED]. Return ONLY the sanitized transcript. DO NOT include any headers, technical reports, or metadata. Output the pure sanitized stream only.`
                : `ULTIMATE PRIVACY OVERRIDE: Inspect the provided image payload for sensitive data. ${filterContext} Replace selected metrics with [NEURAL_REDACTED]. Return ONLY the sanitized transcript. DO NOT include any report markers, headers, or summaries. ADHERE TO MAXIMUM SECURITY CLEARANCE.`;

            const response = await askGemini(
                prompt,
                sanitizedText,
                "redact",
                imageBase64
            );

            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                setStatus('ready');
                return;
            }

            // FAILSAFE LAYER: Run local regex on AI output to ensure nothing slipped through
            const finalSanitized = localRegexSanitize(response);
            setRedactedContent(finalSanitized);
            await recordAIUsage();
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
            className="min-h-screen pb-32 pt-32 max-w-2xl mx-auto px-6 android-sm:px-4"
        >
            <div className="space-y-12">
                <div className="space-y-3">
                    <div className="text-technical">Protocol Assets / Security Layer</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Smart Redact</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Automated PII Neutralization via Neural Pattern Recognition
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Zero Watermark Protocol: Verified Clean Output</span>
                    </div>
                </div>

                {!file ? (
                    <label className="monolith-card h-80 flex flex-col items-center justify-center cursor-pointer group">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl mb-6"
                        >
                            <Shield size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest">Inhibit Sensitive Flow</span>
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : null}

                {!file && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <ToolGuide
                            title="PII Neutralization Engine"
                            description="Automatically identify and redact sensitive personal information from documents and images using a multi-layer security protocol (Local + Neural)."
                            steps={[
                                "Upload a PDF or Image containing sensitive data.",
                                "Initiate Redaction to trigger local & neural scanning.",
                                "Preview the sanitized transcript for verification.",
                                "Export the finalized, privacy-safe asset."
                            ]}
                            useCases={[
                                "ID Cards", "Bank Statements", "Resume Masking", "Public Records", "GDPR Compliance"
                            ]}
                        />
                    </motion.div>
                )}

                {file && (
                    <div className="space-y-6">
                        <div className="monolith-card p-8 android-sm:p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                                    <ShieldAlert size={20} className="text-black dark:text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest truncate max-w-[140px] android-sm:max-w-[100px]">{file.name}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                                        {file.type.startsWith('image/') ? 'Visual Vector' : 'Document Ready'}
                                    </p>
                                </div>
                            </div>
                            {status === 'ready' && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startRedaction}
                                    className="bg-black dark:bg-white text-white dark:text-black px-8 android-sm:px-4 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0"
                                >
                                    Initiate
                                </motion.button>
                            )}
                        </div>

                        {status === 'ready' && (
                            <div className="monolith-card p-6 space-y-6">
                                <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Redaction Control Hub</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => toggleFilter('identity')}
                                        className={`p-4 android-sm:p-3 rounded-[40px] border-2 flex flex-col gap-3 transition-all ${filters.identity ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400'}`}
                                    >
                                        <User size={18} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Identity</span>
                                    </button>
                                    <button
                                        onClick={() => toggleFilter('financial')}
                                        className={`p-4 android-sm:p-3 rounded-[40px] border-2 flex flex-col gap-3 transition-all ${filters.financial ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400'}`}
                                    >
                                        <CreditCard size={18} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Financial</span>
                                    </button>
                                    <button
                                        onClick={() => toggleFilter('contact')}
                                        className={`p-4 android-sm:p-3 rounded-[40px] border-2 flex flex-col gap-3 transition-all ${filters.contact ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400'}`}
                                    >
                                        <Mail size={18} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Contact</span>
                                    </button>
                                    <button
                                        onClick={() => toggleFilter('identifiers')}
                                        className={`p-4 android-sm:p-3 rounded-[40px] border-2 flex flex-col gap-3 transition-all ${filters.identifiers ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400'}`}
                                    >
                                        <Fingerprint size={18} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Identifiers</span>
                                    </button>
                                </div>
                            </div>
                        )}

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
                                <div className="monolith-card p-10 bg-emerald-500/5 border-emerald-500/10 border flex flex-col items-center text-center space-y-6 rounded-[40px]">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                                        <Check size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-emerald-500">Document Sanitized</h3>
                                        <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">
                                            {file.type.startsWith('image/') ? 'Neural Vision has extracted and neutralized PII from the visual asset.' : 'All identified PII has been neutralized from the output stream.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <button
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {showPreview ? "Hide Preview" : "Show Preview"}
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleExport('txt')}
                                                className="px-4 py-3 bg-white/10 dark:bg-black/10 text-black dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-black/5 dark:border-white/5 hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                                <Share2 size={14} />
                                                Text
                                            </button>
                                            <button
                                                onClick={() => handleExport('pdf')}
                                                className="px-4 py-3 bg-white/10 dark:bg-black/10 text-black dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-black/5 dark:border-white/5 hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                                <Share2 size={14} />
                                                PDF
                                            </button>
                                            <button
                                                onClick={() => handleExport('image')}
                                                className="px-4 py-3 bg-white/10 dark:bg-black/10 text-black dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-black/5 dark:border-white/5 hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                                <Share2 size={14} />
                                                Image
                                            </button>
                                            <button
                                                onClick={() => setShowReport(true)}
                                                className="px-4 py-3 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all ml-2"
                                                title="Report AI Content"
                                            >
                                                <Flag size={14} />
                                                Flag
                                            </button>
                                        </div>
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
            <NeuralCoolingUI isVisible={isCooling} onComplete={() => setIsCooling(false)} />
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
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
            <AIReportModal
                isOpen={showReport}
                onClose={() => setShowReport(false)}
            />

            {successData && (
                <SuccessModal
                    isOpen={successData.isOpen}
                    onClose={() => {
                        setSuccessData(null);
                        setFile(null);
                        setRedactedContent('');
                        setStatus('idle');
                        setShowPreview(false);
                    }}
                    operation="Smart Redaction"
                    fileName={successData.fileName}
                    originalSize={successData.originalSize}
                    finalSize={successData.finalSize}
                    onViewFiles={() => {
                        setSuccessData(null);
                        setFile(null);
                        setRedactedContent('');
                        setStatus('idle');
                        setShowPreview(false);
                        navigate('/my-files');
                    }}
                />
            )}
        </motion.div>
    );
};

export default SmartRedactScreen;
