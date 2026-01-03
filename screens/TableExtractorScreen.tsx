
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, FileUp, Loader2, Bot, Download, Table as TableIcon, X, CheckCircle2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractTablesFromDocument, tableToCSV, ExtractedTable } from '../services/tableService';

const TableExtractorScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');
    const [tables, setTables] = useState<ExtractedTable[]>([]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setIsProcessing(true);
            setStatus('analyzing');

            try {
                let extractedTables: ExtractedTable[] = [];

                if (selected.type === 'application/pdf') {
                    const { extractTextFromPdf } = await import('../utils/pdfExtractor');
                    const arrayBuffer = await selected.arrayBuffer();
                    const text = await extractTextFromPdf(arrayBuffer);
                    extractedTables = await extractTablesFromDocument(text);
                } else if (selected.type.startsWith('image/')) {
                    const reader = new FileReader();
                    const imageBase64 = await new Promise<string>((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(selected);
                    });
                    extractedTables = await extractTablesFromDocument(undefined, imageBase64);
                }

                setTables(extractedTables);
                setStatus('done');
            } catch (err) {
                console.error("Extraction Failed:", err);
                setStatus('idle');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const downloadCSV = (table: ExtractedTable) => {
        const csv = tableToCSV(table);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${table.tableName || 'extracted_table'}.csv`;
        a.click();
    };

    const downloadJSON = () => {
        const json = JSON.stringify(tables, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extracted_data.json`;
        a.click();
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
                    <div className="text-technical">Neural Extraction Protocol</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Table AI</h1>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                >
                    <X size={24} />
                </button>
            </div>

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
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Inject Data Source</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-2">Upload Image or PDF for AI extraction</p>
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
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Scanning Grid Layer</h3>
                            <p className="text-technical animate-pulse mt-2">Gemini Neural Parsing Active</p>
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
                                    {tables.length} {tables.length === 1 ? 'Table' : 'Tables'} Recovered
                                </h3>
                                <div className="pt-4 flex gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={downloadJSON}
                                        className="px-6 py-3 bg-white/20 dark:bg-black/20 rounded-full flex items-center gap-2 border border-white/20 dark:border-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all shadow-xl backdrop-blur-md"
                                    >
                                        <Download size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Master JSON</span>
                                    </motion.button>
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
                                            <Download size={20} />
                                        </motion.button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-30">
                                <TableIcon size={48} className="mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No structural grids located</p>
                            </div>
                        )}

                        <button
                            onClick={() => { setStatus('idle'); setTables([]); setFile(null); }}
                            className="w-full py-6 monolith-card bg-black/5 dark:bg-white/5 border-dashed border-2 hover:bg-black/10 dark:hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-[0.4em] text-gray-400"
                        >
                            Reset Protocol
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-20 p-8 monolith-card bg-transparent border-dashed border-2 opacity-30 flex items-center gap-6">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl">
                    <Zap size={20} fill="currentColor" />
                </div>
                <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.3em]">Neural Processing Warning</div>
                    <p className="text-[8px] font-black uppercase tracking-[0.1em] opacity-60">
                        Precision depends on PDF layer clarity. Best results with digital PDFs rather than scans.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default TableExtractorScreen;
