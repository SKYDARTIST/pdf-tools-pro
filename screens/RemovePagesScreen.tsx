import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, FileText, Download, Loader2, FileUp, CheckCircle } from 'lucide-react';
import { downloadBlob, removePagesFromPdf } from '../services/pdfService';
import { FileItem } from '../types';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import ToolGuide from '../components/ToolGuide';

const RemovePagesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<FileItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pageCount, setPageCount] = useState(0);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{
        fileName: string;
        originalSize: number;
        finalSize: number;
        pagesRemoved: number;
    } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile({ id: 'main', file: f, name: f.name, size: f.size, type: f.type });

            // Load PDF to get page count
            setIsLoadingPages(true);
            try {
                const arrayBuffer = await f.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPageCount(pdfDoc.getPageCount());
            } catch (err) {
                alert('Error loading PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
            } finally {
                setIsLoadingPages(false);
            }
        }
    };

    const togglePage = (pageIndex: number) => {
        const newSelected = new Set(selectedPages);
        if (newSelected.has(pageIndex)) {
            newSelected.delete(pageIndex);
        } else {
            newSelected.add(pageIndex);
        }
        setSelectedPages(newSelected);
    };

    const selectAll = () => {
        const allPages = new Set<number>();
        for (let i = 0; i < pageCount; i++) {
            allPages.add(i);
        }
        setSelectedPages(allPages);
    };

    const deselectAll = () => {
        setSelectedPages(new Set());
    };

    const handleRemovePages = async () => {
        if (!file || selectedPages.size === 0) return;

        // Don't allow removing all pages
        if (selectedPages.size >= pageCount) {
            alert('You must keep at least one page in the PDF.');
            return;
        }

        setIsProcessing(true);

        try {
            const result = await removePagesFromPdf(file.file, Array.from(selectedPages));
            const fileName = `edited_${file.name}`;
            downloadBlob(result, fileName, 'application/pdf');

            // Add to file history
            FileHistoryManager.addEntry({
                fileName,
                operation: 'split',
                originalSize: file.size,
                finalSize: result.length,
                status: 'success'
            });

            // Show success modal
            setSuccessData({
                fileName,
                originalSize: file.size,
                finalSize: result.length,
                pagesRemoved: selectedPages.size
            });
            setShowSuccessModal(true);

            // Reset
            setFile(null);
            setSelectedPages(new Set());
            setPageCount(0);
        } catch (err) {
            alert('Error removing pages: ' + (err instanceof Error ? err.message : 'Unknown error'));

            // Add error to history
            FileHistoryManager.addEntry({
                fileName: `remove_pages_failed_${file.name}`,
                operation: 'split',
                status: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen pb-32 pt-32 max-w-2xl mx-auto px-6"
        >
            <div className="space-y-12">
                {/* Header Section */}
                <div className="space-y-3">
                    <div className="text-technical">Protocol Assets / Segment Deletion</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Remove</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Identify and purge structural segments from the asset carrier</p>
                </div>

                <ToolGuide
                    title="Data Purge Protocol"
                    description="Permanently excise redundant or classified pages. Select valid segments to retain while purging irrelevant data layers."
                    steps={[
                        "Initialize the purge protocol by uploading a PDF carrier.",
                        "Analyze individual page segments for deletion.",
                        "Select any pages that must be permanently DELETED.",
                        "Execute Purge to synthesize a cleaned asset carrier."
                    ]}
                    useCases={[
                        "Confidentiality Management", "Document Resizing", "Redundancy Removal", "Classification Control"
                    ]}
                />
            </div>

            {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                    >
                        <Trash2 size={32} />
                    </motion.div>
                    <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Purge</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Maximum 50MB PDF</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                </label>
            ) : (
                <div className="space-y-8 flex-1 flex flex-col">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="monolith-card p-6 flex items-center gap-5 border-none shadow-xl"
                    >
                        <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shrink-0">
                            <FileText size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black uppercase tracking-tighter truncate text-gray-900 dark:text-white">{file.name}</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pageCount} SEGMENTS ARCHIVED</p>
                        </div>
                        <button onClick={() => { setFile(null); setSelectedPages(new Set()); setPageCount(0); }} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                            Change
                        </button>
                    </motion.div>

                    {isLoadingPages ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-rose-500" size={32} />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-700 dark:text-white">
                                    {selectedPages.size} of {pageCount} pages selected
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={deselectAll}
                                        className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pb-4 px-1">
                                <AnimatePresence>
                                    {Array.from({ length: pageCount }, (_, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.01 }}
                                            onClick={() => togglePage(i)}
                                            className={`relative aspect-[3/4] rounded-2xl border transition-all ${selectedPages.has(i)
                                                ? 'border-rose-500 bg-rose-500/5 shadow-inner'
                                                : 'border-black/5 dark:border-white/5 bg-white dark:bg-black hover:border-black/20 dark:hover:border-white/20'
                                                }`}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <FileText size={24} className={selectedPages.has(i) ? 'text-rose-500' : 'text-gray-200 dark:text-gray-800'} />
                                            </div>
                                            <div className="absolute bottom-2 left-0 right-0 text-center">
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${selectedPages.has(i) ? 'text-rose-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    SGN {i + 1}
                                                </span>
                                            </div>
                                            {selectedPages.has(i) && (
                                                <div className="absolute top-2 right-2 flex items-center justify-center">
                                                    <div className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                                                        <Trash2 size={10} className="text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            )}

            <button
                disabled={!file || selectedPages.size === 0 || isProcessing || selectedPages.size >= pageCount}
                onClick={handleRemovePages}
                className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!file || selectedPages.size === 0 || isProcessing || selectedPages.size >= pageCount
                    ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed shadow-none'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:brightness-110 active:scale-95'
                    }`}
            >
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
                />
                {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : (
                    <>
                        <Trash2 size={18} strokeWidth={3} />
                        <span>Execute Purge ({selectedPages.size})</span>
                    </>
                )}
            </button>

            {/* Success Modal */}
            {successData && (
                <SuccessModal
                    isOpen={showSuccessModal}
                    onClose={() => setShowSuccessModal(false)}
                    operation="Remove Pages"
                    fileName={successData.fileName}
                    originalSize={successData.originalSize}
                    finalSize={successData.finalSize}
                    metadata={{ pagesRemoved: successData.pagesRemoved }}
                    onViewFiles={() => {
                        setShowSuccessModal(false);
                        navigate('/my-files');
                    }}
                />
            )}
        </motion.div>
    );
};

export default RemovePagesScreen;
