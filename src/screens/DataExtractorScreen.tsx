import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Table, Database, Loader2, Sparkles, Check, X, AlertCircle, Share2, FileJson, FileSpreadsheet, PenTool, Flag } from 'lucide-react';
import { extractTextFromPdf } from '@/utils/pdfExtractor';
import { askGemini } from '@/services/aiService';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '@/services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import NeuralCoolingUI from '@/components/NeuralCoolingUI';
import AIOptInModal from '@/components/AIOptInModal';
import AIReportModal from '@/components/AIReportModal';
import AiLimitModal from '@/components/AiLimitModal';
import { downloadFile } from '@/services/downloadService';
import ToolGuide from '@/components/ToolGuide';
import SuccessModal from '@/components/SuccessModal';
import { compressImage } from '@/utils/imageProcessor';

const DataExtractorScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState<string>('');
    const [format, setFormat] = useState<'json' | 'csv' | 'markdown'>('json');
    const [error, setError] = useState<string>('');
    const [isCooling, setIsCooling] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [showAiLimit, setShowAiLimit] = useState(false);
    const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any; used: number; limit: number }>({ blockMode: null, used: 0, limit: 0 });
    const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

    const showToast = (message: string) => {
        setError(message);
        setTimeout(() => setError(''), 3000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            try {
                const arrayBuffer = await f.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: f.type });
                const freshFile = new File([blob], f.name, { type: f.type });
                setFile(freshFile);
                setExtractedData('');
                setError('');
            } catch (err) {
                console.error('Failed to read file:', f.name, err);
                showToast('Upload failed. Check file format.');
            }
        }
    };

    const runExtraction = async () => {
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
                used: subscription.aiDocsThisMonth,
                limit: subscription.tier === SubscriptionTier.FREE ? 3 : 50
            });
            setShowAiLimit(true);
            return;
        }

        setIsExtracting(true);
        setError('');

        try {
            let text = "";
            let imageBase64 = "";
            let fileMime = file.type || 'image/jpeg';

            if (file.type === "application/pdf") {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer.slice(0));

                if (!text || text.trim() === '') {
                    const { renderPageToImage } = await import('@/utils/pdfExtractor');
                    const imageRaw = await renderPageToImage(buffer.slice(0), 1);
                    imageBase64 = imageRaw;
                    fileMime = 'image/jpeg';
                    text = "[SCANNED DOCUMENT DETECTED]";
                }
            } else {
                const reader = new FileReader();
                const rawBase64 = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                imageBase64 = await compressImage(rawBase64);
            }

            let prompt = "";
            if (format === 'markdown') {
                prompt = `Extract ALL content from this document into Markdown format. Output ONLY the complete markdown transcription.`;
            } else if (format === 'json') {
                prompt = `Extract ALL content from this document into JSON format. Output ONLY valid JSON.`;
            } else {
                prompt = `Extract ALL content from this document into CSV format. Output ONLY raw CSV data.`;
            }

            const response = await askGemini(prompt, text, "table", imageBase64 || undefined, fileMime);

            if (!response.success) {
                if (response.error?.includes('AI_RATE_LIMIT')) {
                    setIsCooling(true);
                } else {
                    setError(response.error || "Extraction failed. Credit NOT deducted.");
                }
                return;
            }

            const cleanedResponse = (response.data || "")
                .replace(/^```[a-z]*\n/i, '')
                .replace(/\n```$/i, '')
                .trim();

            if (!cleanedResponse || cleanedResponse === '[]' || cleanedResponse === '{}') {
                throw new Error("AI could not find clear data.");
            }

            setExtractedData(cleanedResponse);
            await recordAIUsage(AiOperationType.HEAVY);
        } catch (err: any) {
            setError(err.message || "Extraction failed.");
            console.error(err);
        } finally {
            setIsExtracting(false);
        }
    };

    const downloadData = async () => {
        const mimeType = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown';
        const blob = new Blob([extractedData], { type: mimeType });
        const ext = format === 'markdown' ? 'md' : format;
        await downloadFile(blob, `extracted_data.${ext}`);

        setSuccessData({
            isOpen: true,
            fileName: `extracted_data.${ext}`,
            originalSize: file?.size || 0,
            finalSize: blob.size
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen pb-32 pt-32 max-w-4xl mx-auto px-6"
        >
            <div className="space-y-12">
                <div className="space-y-3">
                    <div className="text-technical">AI Tools / Data Extractor</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Data Extractor</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                        Convert receipts, tables, and notes into clean, structured data
                    </p>
                </div>

                {!file ? (
                    <div className="space-y-12">
                        <ToolGuide
                            title="How to extract data"
                            description="Automatically pull information from invoices, receipts, and handwritten notes. Our AI organizes it into a format you can use."
                            steps={[
                                "Upload a PDF or an image (JPG/PNG).",
                                "Select the format you want (JSON, CSV, or Markdown).",
                                "Tap 'Start AI Extraction' to process the file.",
                                "Download your data file."
                            ]}
                            useCases={[
                                "Receipts & Invoices", "Handwritten Notes", "Whiteboards", "Tables & Sheets"
                            ]}
                        />
                        <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                            <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl mb-6 group-hover:scale-110 transition-transform">
                                <FileUp size={28} />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest text-center px-6">Upload Source (PDF, JPG, PNG)</span>
                            <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="monolith-card p-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500">
                                    <Table size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target File</span>
                                    <span className="text-sm font-black uppercase tracking-tighter">Target File</span>
                                </div>
                            </div>
                            <button onClick={() => setFile(null)} className="p-3 hover:bg-rose-500/10 text-rose-500 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {!extractedData && (
                            <div className="flex flex-col items-center space-y-8">
                                <div className="flex flex-wrap justify-center gap-4">
                                    {(['json', 'csv', 'markdown'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFormat(f)}
                                            className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${format === f ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                                        >
                                            {f === 'json' && <FileJson size={14} />}
                                            {f === 'csv' && <FileSpreadsheet size={14} />}
                                            {f === 'markdown' && <PenTool size={14} />}
                                            {f.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={runExtraction}
                                    disabled={isExtracting}
                                    className="bg-black dark:bg-white text-white dark:text-black px-12 py-6 rounded-full text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl"
                                >
                                    {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                                    {isExtracting ? "Extracting Content..." : "Start AI Extraction"}
                                </motion.button>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-between gap-4 text-rose-500">
                        <div className="flex items-center gap-4">
                            <AlertCircle size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                        </div>
                        <button onClick={() => { setError(''); setFile(null); }} className="px-4 py-2 bg-rose-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors">Retry</button>
                    </div>
                )}

                <AnimatePresence>
                    {extractedData && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="monolith-card p-12 space-y-8"
                        >
                            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles size={20} className="text-emerald-500" />
                                    <span className="text-xs font-black uppercase tracking-widest">Data Extraction Complete</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={downloadData} className="p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:scale-110 transition-all flex items-center gap-2 mr-4">
                                        <Share2 size={16} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Share</span>
                                    </button>
                                    <button onClick={() => setShowReport(true)} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-full transition-colors flex items-center gap-2 mr-2" title="Report AI Content"><Flag size={14} /><span className="text-[8px] font-black uppercase tracking-widest">Flag</span></button>
                                    <button onClick={() => { setExtractedData(''); setFile(null); setError(''); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
                                </div>
                            </div>
                            <div className="bg-black/5 dark:bg-black/40 p-6 rounded-[40px] font-mono text-[11px] overflow-x-auto max-h-96 custom-scrollbar text-gray-600 dark:text-gray-400">
                                <pre>{extractedData}</pre>
                            </div>
                            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-4">
                                <button onClick={() => navigate('/workspace')} className="flex-1 py-4 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Finish Task</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <NeuralCoolingUI isVisible={isCooling} onComplete={() => setIsCooling(false)} />
            <AIOptInModal
                isOpen={showConsent}
                onClose={() => setShowConsent(false)}
                onAccept={() => {
                    localStorage.setItem('ai_neural_consent', 'true');
                    setHasConsent(true);
                    setShowConsent(false);
                    runExtraction();
                }}
            />
            <AIReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
            <AiLimitModal isOpen={showAiLimit} onClose={() => setShowAiLimit(false)} blockMode={aiLimitInfo.blockMode} used={aiLimitInfo.used} limit={aiLimitInfo.limit} />
            {successData && (
                <SuccessModal
                    isOpen={successData.isOpen}
                    onClose={() => setSuccessData(null)}
                    data={{ fileName: successData.fileName, originalSize: successData.originalSize, finalSize: successData.finalSize }}
                />
            )}
        </motion.div >
    );
};

export default DataExtractorScreen;
