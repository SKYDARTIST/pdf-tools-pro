import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Table, Database, Loader2, Sparkles, Check, X, AlertCircle, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { askGemini } from '../services/aiService';
import { useNavigate } from 'react-router-dom';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';

const DataExtractorScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState<string>('');
    const [format, setFormat] = useState<'json' | 'csv'>('json');
    const [error, setError] = useState<string>('');
    const [isCooling, setIsCooling] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setExtractedData('');
            setError('');
        }
    };

    const runExtraction = async () => {
        if (!file) return;

        if (!hasConsent) {
            setShowConsent(true);
            return;
        }

        setIsExtracting(true);
        setError('');

        try {
            const buffer = await file.arrayBuffer();
            const text = await extractTextFromPdf(buffer);

            const prompt = `Extract all tabular or structured data from this document and convert it into a clean ${format.toUpperCase()} format. 
            Ensure all headers and values are correctly mapped. 
            DOCUMENT TEXT: ${text.substring(0, 8000)}
            
            Output ONLY the raw ${format.toUpperCase()} content. No explanations.`;

            const response = await askGemini(prompt, "Extracting structured data.", "table");
            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                return;
            }
            setExtractedData(response);
        } catch (err) {
            setError("Extraction failed. Document may be too complex or binary.");
            console.error(err);
        } finally {
            setIsExtracting(false);
        }
    };

    const downloadData = () => {
        const blob = new Blob([extractedData], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extracted_data.${format}`;
        a.click();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen pb-32 pt-32 max-w-4xl mx-auto px-6"
        >
            <div className="space-y-12">
                <div className="space-y-3">
                    <div className="text-technical">Neural Lab / Structured Data Extraction</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Intelligence Extractor</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Convert unstructured PDF noise into high-fidelity data feeds
                    </p>
                </div>

                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                        <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-[24px] flex items-center justify-center shadow-2xl mb-6 group-hover:scale-110 transition-transform">
                            <FileUp size={28} />
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest">Upload Data Source (PDF)</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="space-y-8">
                        <div className="monolith-card p-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                                    <Table size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target File</span>
                                    <span className="text-sm font-black uppercase tracking-tighter">{file.name}</span>
                                </div>
                            </div>
                            <button onClick={() => setFile(null)} className="p-3 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {!extractedData && (
                            <div className="flex flex-col items-center space-y-8">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setFormat('json')}
                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${format === 'json' ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                                    >
                                        <FileJson size={14} /> JSON Format
                                    </button>
                                    <button
                                        onClick={() => setFormat('csv')}
                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${format === 'csv' ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}
                                    >
                                        <FileSpreadsheet size={14} /> CSV Format
                                    </button>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={runExtraction}
                                    disabled={isExtracting}
                                    className="bg-black dark:bg-white text-white dark:text-black px-12 py-6 rounded-[32px] text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl"
                                >
                                    {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                                    {isExtracting ? "Extracting Data Weights..." : "Extract Structured Data"}
                                </motion.button>
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
                                    <span className="text-xs font-black uppercase tracking-widest">Target Dataset Stabilized</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={downloadData}
                                        className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all flex items-center gap-2 mr-4"
                                    >
                                        <Download size={16} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Download .{format}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowReport(true)}
                                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors flex items-center gap-2 mr-2"
                                        title="Report AI Content"
                                    >
                                        <Flag size={14} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Flag</span>
                                    </button>
                                    <button
                                        onClick={() => setExtractedData('')}
                                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                                    >
                                        <X size={18} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-black/5 dark:bg-black/40 p-6 rounded-3xl font-mono text-[11px] overflow-x-auto max-h-96 custom-scrollbar text-gray-600 dark:text-gray-400">
                                <pre>{extractedData}</pre>
                            </div>

                            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-4">
                                <button
                                    onClick={() => navigate('/workspace')}
                                    className="flex-1 py-4 bg-black/5 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                    Return to Lab
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
        </motion.div >
    );
};

export default DataExtractorScreen;
