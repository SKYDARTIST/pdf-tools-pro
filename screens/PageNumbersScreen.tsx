import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Hash, Download, Loader2, FileText, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadFile } from '../services/downloadService';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import ShareModal from '../components/ShareModal';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';

const PageNumbersScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [position, setPosition] = useState<'bottom-center' | 'bottom-left' | 'bottom-right'>('bottom-center');
    const [format, setFormat] = useState<'number' | 'page-of-total'>('page-of-total');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [processedFile, setProcessedFile] = useState<{
        data: Uint8Array;
        name: string;
        size: number;
    } | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);

            try {
                const arrayBuffer = await f.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPageCount(pdfDoc.getPageCount());
            } catch (err) {
                alert('Error loading PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
            }
        }
    };

    const handleAddPageNumbers = async () => {
        if (!file) return;

        if (!TaskLimitManager.canUseTask()) {
            setShowUpgradeModal(true);
            return;
        }

        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const pages = pdfDoc.getPages();

            pages.forEach((page, index) => {
                const { width, height } = page.getSize();
                const pageNumber = index + 1;
                const text = format === 'number'
                    ? `${pageNumber}`
                    : `Page ${pageNumber} of ${pages.length}`;

                const textWidth = font.widthOfTextAtSize(text, 10);

                let x = 0;
                if (position === 'bottom-center') {
                    x = (width - textWidth) / 2;
                } else if (position === 'bottom-left') {
                    x = 30;
                } else {
                    x = width - textWidth - 30;
                }

                page.drawText(text, {
                    x,
                    y: 20,
                    size: 10,
                    font,
                    color: rgb(0.5, 0.5, 0.5),
                });
            });

            const pdfBytes = await pdfDoc.save();
            const fileName = `numbered_${file.name}`;

            setProcessedFile({
                data: pdfBytes,
                name: fileName,
                size: pdfBytes.length
            });

            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            await downloadFile(blob, fileName);

            FileHistoryManager.addEntry({
                fileName,
                operation: 'watermark',
                originalSize: file.size,
                finalSize: pdfBytes.length,
                status: 'success'
            });

            setShowSuccessModal(true);
            TaskLimitManager.incrementTask();
            // Reset deferred
        } catch (err) {
            alert('Error adding page numbers: ' + (err instanceof Error ? err.message : 'Unknown error'));

            FileHistoryManager.addEntry({
                fileName: `page_numbers_failed_${file.name}`,
                operation: 'watermark',
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
                    <div className="text-technical">Protocol Assets / Sequential Indexing</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Number</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Apply sequential metadata markers to track structural asset flow</p>
                </div>

                <ToolGuide
                    title="Hierarchical Indexing Protocol"
                    description="Apply structural markers for sequential navigation. Embed persistent page numbers onto the document layer for auditing."
                    steps={[
                        "Initialize the indexing protocol by uploading a PDF carrier.",
                        "Select the desired indexing schema (Simple or Extended).",
                        "Configure the spatial anchoring (Left, Center, or Right).",
                        "Execute Indexing to finalize the structural markers."
                    ]}
                    useCases={[
                        "Lease Agreements", "Academic Papers", "Legal Bundles", "Pagination Control"
                    ]}
                />

                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                        <motion.div
                            whileHover={{ scale: 1.1, y: -5 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                        >
                            <Hash size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Indexing</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Maximum 50MB PDF</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="space-y-8">
                        {/* File Info */}
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
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pageCount} PAGES ARCHIVED</p>
                            </div>
                            <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                                Change
                            </button>
                        </motion.div>

                        <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none space-y-8">
                            {/* Format Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <FileText size={14} className="text-black dark:text-white" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Indexing Schema</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setFormat('number')}
                                        className={`p-6 rounded-[28px] border transition-all text-left group ${format === 'number'
                                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-xl ring-4 ring-black/5 dark:ring-white/5'
                                            : 'border-black/5 dark:border-white/5 bg-white dark:bg-black text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <p className="text-[11px] font-black uppercase tracking-widest">Simple</p>
                                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${format === 'number' ? 'opacity-60' : 'opacity-40'}`}>1, 2, 3...</p>
                                    </button>
                                    <button
                                        onClick={() => setFormat('page-of-total')}
                                        className={`p-6 rounded-[28px] border transition-all text-left group ${format === 'page-of-total'
                                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-xl ring-4 ring-black/5 dark:ring-white/5'
                                            : 'border-black/5 dark:border-white/5 bg-white dark:bg-black text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <p className="text-[11px] font-black uppercase tracking-widest">Extended</p>
                                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${format === 'page-of-total' ? 'opacity-60' : 'opacity-40'}`}>Page X of Y</p>
                                    </button>
                                </div>
                            </div>

                            {/* Position Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <AlignLeft size={14} className="text-black dark:text-white" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Spatial Anchoring</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setPosition('bottom-left')}
                                        className={`p-5 rounded-2xl border transition-all ${position === 'bottom-left'
                                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                                            : 'border-black/5 dark:border-white/5 bg-white dark:bg-black text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <AlignLeft size={18} className="mx-auto" />
                                    </button>
                                    <button
                                        onClick={() => setPosition('bottom-center')}
                                        className={`p-5 rounded-2xl border transition-all ${position === 'bottom-center'
                                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                                            : 'border-black/5 dark:border-white/5 bg-white dark:bg-black text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <AlignCenter size={18} className="mx-auto" />
                                    </button>
                                    <button
                                        onClick={() => setPosition('bottom-right')}
                                        className={`p-5 rounded-2xl border transition-all ${position === 'bottom-right'
                                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                                            : 'border-black/5 dark:border-white/5 bg-white dark:bg-black text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <AlignRight size={18} className="mx-auto" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={handleAddPageNumbers}
                            disabled={isProcessing}
                            className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${isProcessing
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
                                    <Download size={18} strokeWidth={3} />
                                    <span>Execute Indexing</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Success Modal */}
            {processedFile && (
                <>
                    <SuccessModal
                        isOpen={showSuccessModal}
                        onClose={() => {
                            setShowSuccessModal(false);
                            setFile(null);
                            setPageCount(0);
                        }}
                        operation="Add Page Numbers"
                        fileName={processedFile.name}
                        originalSize={file?.size}
                        finalSize={processedFile.size}
                        onViewFiles={() => {
                            setShowSuccessModal(false);
                            setFile(null);
                            setPageCount(0);
                            navigate('/my-files');
                        }}
                        onShare={() => {
                            setShowSuccessModal(false);
                            setShowShareModal(true);
                        }}
                    />

                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        fileName={processedFile.name}
                        fileData={processedFile.data}
                        fileType="application/pdf"
                    />
                </>
            )}

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                reason="limit_reached"
            />
        </motion.div>
    );
};

export default PageNumbersScreen;
