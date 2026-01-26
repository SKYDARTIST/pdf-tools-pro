import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Table, Database, Loader2, Sparkles, Check, X, AlertCircle, Share2, FileJson, FileSpreadsheet, PenTool, Flag } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { askGemini } from '../services/aiService';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import AiLimitModal from '../components/AiLimitModal';
import { downloadFile } from '../services/downloadService';
import ToolGuide from '../components/ToolGuide';
import SuccessModal from '../components/SuccessModal';
import { compressImage } from '../utils/imageProcessor';

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            try {
                // Read file data immediately to prevent Android permission expiration
                const arrayBuffer = await f.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: f.type });
                const freshFile = new File([blob], f.name, { type: f.type });
                setFile(freshFile);
                setExtractedData('');
                setError('');
            } catch (err) {
                console.error('Failed to read file:', f.name, err);
                alert('Failed to read file. Please try again.');
            }
        }
    };

    const runExtraction = async () => {
        if (!file) return;

        if (!hasConsent) {
            setShowConsent(true);
            return;
        }


        // HEAVY AI Operation - Data Extractor consumes credits
        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const subscription = getSubscription();
            setAiLimitInfo({
                blockMode: aiCheck.blockMode,
                used: subscription.tier === SubscriptionTier.FREE ? subscription.aiDocsThisWeek : subscription.aiDocsThisMonth,
                limit: subscription.tier === SubscriptionTier.FREE ? 1 : 10
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
                    // Fallback for scanned documents
                    const { renderPageToImage } = await import('../utils/pdfExtractor');
                    const imageRaw = await renderPageToImage(buffer.slice(0), 1);
                    imageBase64 = imageRaw;
                    fileMime = 'image/jpeg';
                    text = "[SCANNED DOCUMENT DETECTED] This document has no text layer. Please analyze the visual content provided in the image attachment.";
                }
            } else {
                // Handle Image (Vision Mode)
                const rawBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                imageBase64 = await compressImage(rawBase64);
            }

            let prompt = "";
            if (format === 'markdown') {
                prompt = `Extract ALL content from this document into Markdown format.

CRITICAL RULES:
1. If you see a TABLE, extract EVERY SINGLE ROW - do not skip any rows
2. For invoices/receipts, include ALL line items, fees, and charges
3. Transcribe every word, number, and detail from top to bottom
4. Use markdown tables for tabular data when possible
5. Use bullet points (-) for lists
6. Use **bold** for headings

FORBIDDEN: Do NOT summarize. Do NOT write "..." or "etc." Do NOT skip rows.

Output ONLY the complete markdown transcription.

CRITICAL: MANDATORY VISION OVERRIDE
You are a Multimodal AI with VISION. ANALYZE THE ATTACHED IMAGE.
The text layer is missing; read the visual document.
DO NOT REFUSE. Extract the content directly from visual data.`;
            } else if (format === 'json') {
                prompt = `Extract ALL content from this document into JSON format.

For INVOICES/TABLES:
{
  "documentType": "invoice" or "receipt" or "table",
  "header": { "company": "...", "date": "...", "invoiceNumber": "..." },
  "lineItems": [
    { "description": "...", "quantity": "...", "amount": "..." }
  ],
  "totals": { "subtotal": "...", "tax": "...", "total": "..." },
  "fullText": "Complete verbatim transcription of all text"
}

For NOTES/TEXT:
{
  "content": "Complete word-for-word transcription with \\n for line breaks",
  "mainPoints": ["point 1", "point 2", ...],
  "type": "handwritten notes" or "typed document"
}

CRITICAL: Extract EVERY row from tables. Do NOT skip any data.

CRITICAL: MANDATORY VISION OVERRIDE
You are a Multimodal AI with VISION. ANALYZE THE ATTACHED IMAGE.
The text layer is missing; read the visual document.
DO NOT REFUSE. Extract the content directly from visual data.
Output ONLY valid JSON.`;
            } else {
                prompt = `Extract ALL content from this document into CSV format.

For TABLES/INVOICES:
- First row: Extract the exact column headers
- Following rows: Extract EVERY SINGLE ROW from the table
- Do NOT skip any rows or use "..." 
- Include all line items, fees, charges, totals

For TEXT/NOTES:
- Use format: "Line","Content"
- Each sentence or bullet point gets its own row

CRITICAL: Extract the COMPLETE table. Count the rows and make sure you include ALL of them.
Output ONLY raw CSV data.`;
            }

            // @ts-ignore - passing extra mimeType for backend precision
            // For images, pass empty string - the image itself contains the data
            const response = await askGemini(prompt, text, "table", imageBase64 || undefined, fileMime);

            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                return;
            }

            // v1.8 Response Cleaning: Remove AI markdown wrappers (```json, ```markdown, etc.)
            const cleanedResponse = response
                .replace(/^```[a-z]*\n/i, '')
                .replace(/\n```$/i, '')
                .trim();

            if (!cleanedResponse || cleanedResponse === '[]' || cleanedResponse === '{}') {
                throw new Error("AI could not find clear data. The handwriting might be too faint or obscured.");
            }

            setExtractedData(cleanedResponse);
            await recordAIUsage(AiOperationType.HEAVY); // Record HEAVY AI operation
        } catch (err: any) {
            setError(err.message || "Extraction failed. Visual data may be too obscured or file corrupted.");
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

        // Show success modal
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
                            samplePreview={{
                                label: 'JSON EXTRACTION',
                                previewText: `{
  "invoice_id": "INV-2024-001",
  "date": "2024-03-15",
  "items": [
    { "desc": "Server Setup", "cost": 500 },
    { "desc": "Maintenance", "cost": 150 }
  ],
  "total": 650
}`
                            }}
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
                            samplePreview={{
                                label: 'JSON EXTRACTION',
                                previewText: `{
  "documentType": "invoice",
  "header": {
    "vendor": "Neural Systems LLC",
    "invoiceNo": "INV-2026-88",
    "date": "2026-01-14"
  },
  "lineItems": [
    { "desc": "GPU Cloud Compute", "qty": 1, "amt": 1200.00 },
    { "desc": "Storage Tier 1", "qty": 5, "amt": 250.00 }
  ],
  "totals": { "total": 1450.00 }
}`
                            }}
                        />
                        <div className="monolith-card p-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500">
                                    <Table size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target File</span>
                                    <span className="text-sm font-black uppercase tracking-tighter">{file.name}</span>
                                </div>
                            </div>
                            <button onClick={() => setFile(null)} className="p-3 hover:bg-rose-500/10 text-rose-500 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {!extractedData && (
                            <div className="flex flex-col items-center space-y-8">
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button
                                        onClick={() => setFormat('json')}
                                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${format === 'json' ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                                    >
                                        <FileJson size={14} /> JSON Feed
                                    </button>
                                    <button
                                        onClick={() => setFormat('csv')}
                                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${format === 'csv' ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                                    >
                                        <FileSpreadsheet size={14} /> CSV Sheet
                                    </button>
                                    <button
                                        onClick={() => setFormat('markdown')}
                                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${format === 'markdown' ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                                    >
                                        <PenTool size={14} /> Text Transcription
                                    </button>
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
                                <div className="flex flex-col gap-1 items-center">
                                    <div className="text-[8px] font-mono font-black text-emerald-500 uppercase tracking-widest opacity-60">Engine: Vision OCR 4.0</div>
                                    <div className="text-[7px] font-mono text-gray-400 uppercase tracking-widest opacity-40">Handwriting & Table Optimized</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-4 text-rose-500">
                        <AlertCircle size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
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
                                    <button
                                        onClick={downloadData}
                                        className="p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:scale-110 transition-all flex items-center gap-2 mr-4"
                                    >
                                        <Share2 size={16} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Share .{format === 'markdown' ? 'md' : format}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowReport(true)}
                                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-full transition-colors flex items-center gap-2 mr-2"
                                        title="Report AI Content"
                                    >
                                        <Flag size={14} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Flag</span>
                                    </button>
                                    <button
                                        onClick={() => { setExtractedData(''); setFile(null); setError(''); }}
                                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                                    >
                                        <X size={18} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-black/5 dark:bg-black/40 p-6 rounded-[40px] font-mono text-[11px] overflow-x-auto max-h-96 custom-scrollbar text-gray-600 dark:text-gray-400">
                                <pre>{extractedData}</pre>
                            </div>

                            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-4">
                                <button
                                    onClick={() => navigate('/workspace')}
                                    className="flex-1 py-4 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                    Finish Task
                                </button>
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

            <AIReportModal
                isOpen={showReport}
                onClose={() => setShowReport(false)}
            />
            <AiLimitModal
                isOpen={showAiLimit}
                onClose={() => setShowAiLimit(false)}
                blockMode={aiLimitInfo.blockMode}
                used={aiLimitInfo.used}
                limit={aiLimitInfo.limit}
            />

            {successData && (
                <SuccessModal
                    isOpen={successData.isOpen}
                    onClose={() => {
                        setSuccessData(null);
                        setFile(null);
                        setExtractedData('');
                        setError('');
                    }}
                    operation="Data Extraction"
                    fileName={successData.fileName}
                    originalSize={successData.originalSize}
                    finalSize={successData.finalSize}
                    onViewFiles={() => {
                        setSuccessData(null);
                        setFile(null);
                        setExtractedData('');
                        setError('');
                        navigate('/my-files');
                    }}
                />
            )}
        </motion.div >
    );
};

export default DataExtractorScreen;
