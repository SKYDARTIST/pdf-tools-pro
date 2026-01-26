
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, FileUp, Loader2, Bot, Share2, Table as TableIcon, X, CheckCircle2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractTablesFromDocument, tableToCSV, ExtractedTable } from '../services/tableService';
import { downloadFile } from '../services/downloadService';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '../services/subscriptionService';
import AiLimitModal from '../components/AiLimitModal';
import ToolGuide from '../components/ToolGuide';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { Flag } from 'lucide-react';
import { compressImage } from '../utils/imageProcessor';
import SuccessModal from '../components/SuccessModal';

const TableExtractorScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');
    const [tables, setTables] = useState<ExtractedTable[]>([]);
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [showAiLimit, setShowAiLimit] = useState(false);
    const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any; used: number; limit: number }>({ blockMode: null, used: 0, limit: 0 });
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];

            if (!hasConsent) {
                setPendingFile(selected);
                setShowConsent(true);
                return;
            }

            processFile(selected);
        }
    };


    const processFile = async (selected: File) => {
        // HEAVY AI Operation - Table Extractor consumes credits
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

        setFile(selected);
        setIsProcessing(true);
        setStatus('analyzing');

        try {
            let extractedTables: ExtractedTable[] = [];

            if (selected.type === 'application/pdf') {
                const arrayBuffer = await selected.arrayBuffer();
                const text = await extractTextFromPdf(arrayBuffer.slice(0));

                if (!text || text.trim() === '') {
                    // Fallback for scanned documents
                    const { renderPageToImage } = await import('../utils/pdfExtractor');
                    const imageBase64 = await renderPageToImage(arrayBuffer.slice(0), 1);
                    extractedTables = await extractTablesFromDocument(undefined, imageBase64);
                } else {
                    extractedTables = await extractTablesFromDocument(text);
                }
            } else if (selected.type.startsWith('image/')) {
                const reader = new FileReader();
                const rawBase64 = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(selected);
                });
                const imageBase64 = await compressImage(rawBase64);
                extractedTables = await extractTablesFromDocument(undefined, imageBase64);
            }

            setTables(extractedTables);
            await recordAIUsage(AiOperationType.HEAVY); // Record HEAVY AI operation
            setStatus('done');
        } catch (err) {
            console.error("Extraction Failed:", err);
            setStatus('idle');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadCSV = async (table: ExtractedTable) => {
        const csv = tableToCSV(table);
        const fileName = `${table.tableName || 'extracted_table'}.csv`;
        const blob = new Blob([csv], { type: 'text/csv' });
        await downloadFile(blob, fileName);

        setSuccessData({
            isOpen: true,
            fileName,
            originalSize: file?.size || 0,
            finalSize: blob.size
        });
    };

    const downloadJSON = async () => {
        const json = JSON.stringify(tables, null, 2);
        const fileName = `extracted_data.json`;
        const blob = new Blob([json], { type: 'application/json' });
        await downloadFile(blob, fileName);

        setSuccessData({
            isOpen: true,
            fileName,
            originalSize: file?.size || 0,
            finalSize: blob.size
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-transparent pb-32 pt-20 px-6 max-w-2xl mx-auto"
        >
            <div className="flex justify-between items-center mb-12">
                <div className="space-y-1">
                    <div className="text-technical">AI Tools / Table Extractor</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Table AI</h1>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                >
                    <X size={24} />
                </button>
            </div>

            <ToolGuide
                title="How to extract tables"
                description="Automatically find tables and spreadsheets inside your PDF or images. We'll turn them into clean CSV or JSON files you can use in Excel."
                steps={[
                    "Upload your PDF or Image containing a table.",
                    "Our AI performs a deep scan for any table or grid.",
                    "We identify the rows and columns and extract the data.",
                    "Export your tables as clean CSV or JSON files."
                ]}
                useCases={[
                    "Financial Reports", "Data Entry", "Digitizing Documents", "Excel Preparation"
                ]}
            />

            <AnimatePresence mode="wait">
                {status === 'idle' && (
                    <motion.label
                        key="idle"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="monolith-card flex flex-col items-center justify-center py-24 cursor-pointer group border-dashed border-2"
                    >
                        <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500">
                            <FileUp size={32} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Upload Source File</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-2">Choose a PDF or Image to find tables</p>
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileSelect} />
                    </motion.label>
                )}

                {status === 'analyzing' && (
                    <motion.div
                        key="analyzing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="monolith-card py-24 flex flex-col items-center space-y-8"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                className="w-32 h-32 border-t-2 border-l-2 border-violet-500 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FileSpreadsheet size={40} className="text-violet-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Scanning for Tables...</h3>
                            <p className="text-technical animate-pulse mt-2">AI is analyzing your document</p>
                        </div>
                    </motion.div>
                )}

                {status === 'done' && (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="monolith-card p-8 bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black border-none shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Bot size={80} />
                            </div>
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={24} />
                                    <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Extraction Complete</span>
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">
                                    {tables.length} {tables.length === 1 ? 'Table' : 'Tables'} Found
                                </h3>
                                <div className="pt-4 flex gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={downloadJSON}
                                        className="px-6 py-3 bg-white/20 dark:bg-black/20 rounded-full flex items-center gap-2 border border-white/20 dark:border-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all shadow-xl backdrop-blur-md"
                                    >
                                        <Share2 size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Download JSON</span>
                                    </motion.button>
                                    <button
                                        onClick={() => setShowReport(true)}
                                        className="px-6 py-3 bg-rose-500/20 rounded-full flex items-center gap-2 border border-rose-500/20 hover:bg-rose-500/30 transition-all backdrop-blur-md"
                                        title="Report AI Content"
                                    >
                                        <Flag size={14} className="text-white dark:text-rose-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white dark:text-rose-500">Flag AI</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {tables.length > 0 ? (
                            <div className="space-y-4">
                                {tables.map((table, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i}
                                        className="monolith-card p-6 flex items-center justify-between group hover:shadow-2xl transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center">
                                                <TableIcon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                                    {table.tableName || `Table ${i + 1}`}
                                                </h4>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                    {table.headers.length} Columns • {table.rows.length} Rows
                                                </p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1, x: -5 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => downloadCSV(table)}
                                            className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"
                                        >
                                            <Share2 size={20} />
                                        </motion.button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-30">
                                <TableIcon size={48} className="mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No tables found</p>
                            </div>
                        )}

                        <button
                            onClick={() => { setStatus('idle'); setTables([]); setFile(null); }}
                            className="w-full py-6 monolith-card bg-black/5 dark:bg-white/5 border-dashed border-2 hover:bg-black/10 dark:hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-[0.4em] text-gray-400"
                        >
                            Start Over
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AIOptInModal
                isOpen={showConsent}
                onClose={() => setShowConsent(false)}
                onAccept={() => {
                    localStorage.setItem('ai_neural_consent', 'true');
                    setHasConsent(true);
                    setShowConsent(false);
                    if (pendingFile) {
                        processFile(pendingFile);
                        setPendingFile(null);
                    }
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
                        setStatus('idle');
                        setTables([]);
                        setFile(null);
                    }}
                    operation="Table Extraction"
                    fileName={successData.fileName}
                    originalSize={successData.originalSize}
                    finalSize={successData.finalSize}
                    onViewFiles={() => {
                        setSuccessData(null);
                        setStatus('idle');
                        setTables([]);
                        setFile(null);
                        navigate('/my-files');
                    }}
                />
            )}
        </motion.div>
    );
};

export default TableExtractorScreen;
