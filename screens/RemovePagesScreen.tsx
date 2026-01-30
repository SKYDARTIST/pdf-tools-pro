import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, FileText, Share2, Loader2, Shield, CheckCircle } from 'lucide-react';
import { removePagesFromPdf } from '../services/pdfService';
import { downloadFile } from '../services/downloadService';
import { FileItem } from '../types';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';

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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];

            // Load PDF to get page count
            setIsLoadingPages(true);
            try {
                const arrayBuffer = await f.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPageCount(pdfDoc.getPageCount());

                const blob = new Blob([arrayBuffer], { type: f.type });
                const freshFile = new File([blob], f.name, { type: f.type });

                setFile({
                    id: 'main',
                    file: freshFile,
                    name: f.name,
                    size: f.size,
                    type: f.type
                });
            } catch (err) {
                console.error('Error loading PDF:', err);
                alert('Could not load PDF. Please ensure it is not password protected.');
            } finally {
                setIsLoadingPages(false);
            }
        }
    };

    const togglePageSelection = (pageIndex: number) => {
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

        if (!TaskLimitManager.canUseTask()) {
            setShowUpgradeModal(true);
            return;
        }

        setIsProcessing(true);

        try {
            const result = await removePagesFromPdf(file.file, Array.from(selectedPages));
            const fileName = `edited_${file.name}`;
            const blob = new Blob([result as any], { type: 'application/pdf' });
            await downloadFile(blob, fileName);

            // Add to file history
            FileHistoryManager.addEntry({
                fileName,
                operation: 'split',
                originalSize: file.size,
                finalSize: result.length,
                status: 'success'
            });

            // Increment task counter
            TaskLimitManager.incrementTask();

            // Show success modal
            setSuccessData({
                fileName,
                originalSize: file.size,
                finalSize: result.length,
                pagesRemoved: selectedPages.size
            });
            setShowSuccessModal(true);
        } catch (err) {
            alert('Error removing pages: ' + (err instanceof Error ? err.message : 'Unknown error'));

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
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                            <Trash2 size={24} />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Remove Pages</h1>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] max-w-sm">
                        Select pages to delete from your document.
                    </p>
                </div>

                {!file ? (
                    <div className="space-y-6">
                        <label className="block p-12 border-2 border-dashed border-white/10 rounded-[40px] hover:border-red-500/30 transition-all cursor-pointer group relative overflow-hidden">
                            <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf" />
                            <div className="flex flex-col items-center gap-6 text-center relative z-10">
                                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText size={32} className="text-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Upload PDF Document</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest text-center">Max size: 50MB</div>
                                </div>
                            </div>
                        </label>
                        <ToolGuide
                            title="How to remove pages"
                            description="Surgical document editing. Precise removal of unwanted pages from your PDF to streamline content and reduce file size."
                            steps={[
                                "Tap to upload your PDF document",
                                "Select the pages you want to delete",
                                "Click 'Confirm Changes' to finalize",
                                "Download your trimmed document instantly"
                            ]}
                            useCases={[
                                "Trimming Contracts", "Removing Blank Pages", "Snippet Extraction", "Data Sanitization"
                            ]}
                        />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* File Card */}
                        <div className="p-6 monolith-glass border-red-500/20 rounded-[32px] flex items-center justify-between group shadow-2xl relative overflow-hidden">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
                                    <FileText size={24} className="text-red-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[11px] font-black text-white uppercase truncate max-w-[180px] tracking-wide">Active Document</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB • {pageCount} Pages</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="p-3 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* Page Grid */}
                        {isLoadingPages ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <Loader2 className="animate-spin text-red-500" size={32} />
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Indexing Neuro-Map...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center px-2">
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">
                                        Selected: <span className="text-red-500">{selectedPages.size}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={selectAll} className="text-[8px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Select All</button>
                                        <button onClick={deselectAll} className="text-[8px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Deselect All</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                    {Array.from({ length: pageCount }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ y: -4 }}
                                            onClick={() => togglePageSelection(i)}
                                            className={`aspect-[3/4] rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative group overflow-hidden ${selectedPages.has(i)
                                                ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                                : 'bg-white/5 border-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <span className={`text-xl font-black ${selectedPages.has(i) ? 'text-white' : 'text-gray-600'}`}>
                                                {i + 1}
                                            </span>
                                            {selectedPages.has(i) && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle size={14} className="text-red-500" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Bar */}
                        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-2xl px-6 pointer-events-none">
                            <motion.button
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                onClick={handleRemovePages}
                                disabled={isProcessing || selectedPages.size === 0}
                                className="w-full h-16 bg-red-500 text-white rounded-[40px] shadow-2xl flex items-center justify-center gap-4 group hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale pointer-events-auto overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {isProcessing ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Trash2 size={20} />
                                )}
                                <span className="font-black text-xs uppercase tracking-[0.3em]">
                                    {isProcessing ? 'Processing...' : `Remove ${selectedPages.size} ${selectedPages.size === 1 ? 'Page' : 'Pages'}`}
                                </span>
                            </motion.button>
                        </div>
                    </div>
                )}

                {showSuccessModal && (
                    <SuccessModal
                        isOpen={showSuccessModal}
                        onClose={() => setShowSuccessModal(false)}
                        data={successData ? {
                            fileName: successData.fileName,
                            originalSize: successData.originalSize,
                            finalSize: successData.finalSize,
                            pagesRemoved: successData.pagesRemoved
                        } : null}
                    />
                )}

                <UpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    reason="limit_reached"
                />
            </div>
        </motion.div>
    );
};

export default RemovePagesScreen;
