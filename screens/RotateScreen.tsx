import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, RotateCw, Share2, Loader2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import { downloadFile } from '../services/downloadService';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import ShareModal from '../components/ShareModal';
import { useNavigate } from 'react-router-dom';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';

const RotateScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);
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

            // Load PDF to get page count
            try {
                const arrayBuffer = await f.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPageCount(pdfDoc.getPageCount());
            } catch (err) {
                alert('Error loading PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
            }
        }
    };

    const handleRotate = async (angle: number) => {
        if (!file) return;

        if (!TaskLimitManager.canUseTask()) {
            setShowUpgradeModal(true);
            return;
        }

        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            // Rotate all pages
            const pages = pdfDoc.getPages();
            pages.forEach(page => {
                page.setRotation(degrees(angle));
            });

            const pdfBytes = await pdfDoc.save();
            const fileName = `rotated_${file.name}`;

            // Store for sharing
            setProcessedFile({
                data: pdfBytes,
                name: fileName,
                size: pdfBytes.length
            });

            // Download
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            await downloadFile(blob, fileName);

            // Add to history
            FileHistoryManager.addEntry({
                fileName,
                operation: 'split',
                originalSize: file.size,
                finalSize: pdfBytes.length,
                status: 'success'
            });

            // Increment task count
            TaskLimitManager.incrementTask();

            // Show success modal
            setShowSuccessModal(true);

            // Reset deferred
        } catch (err) {
            alert('Error rotating PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));

            FileHistoryManager.addEntry({
                fileName: `rotate_failed_${file.name}`,
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
                    <div className="text-technical">Protocol Assets / Spatial Orientation</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Rotate</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Adjust structural alignment of asset carrier pages</p>
                </div>

                <ToolGuide
                    title="Perspective Alignment Protocol"
                    description="Correct the orientation of visual data streams. Align incorrectly scanned or captured document layers."
                    steps={[
                        "Initialize the alignment protocol by uploading a PDF carrier.",
                        "Select the target orientation (90° Right, Left, or Invert).",
                        "Validate the spatial reconstruction in the workspace.",
                        "Execute Alignment to stabilize the document's perspective."
                    ]}
                    useCases={[
                        "Scan Correction", "Orientation Fixing", "Data Standardization", "Presentation Preparation"
                    ]}
                />

                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                        >
                            <RotateCw size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Alignment</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Maximum 50MB PDF</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="space-y-6">
                        {/* File Info */}
                        <div className="monolith-card p-6 flex items-center gap-5 border-none shadow-xl">
                            <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shrink-0">
                                <FileText size={28} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black uppercase tracking-tighter truncate text-gray-900 dark:text-white">{file.name}</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pageCount} PAGES ARCHIVED</p>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
                            >
                                Change
                            </button>
                        </div>

                        <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none space-y-6">
                            <div className="flex items-center gap-3">
                                <RotateCw size={14} className="text-black dark:text-white" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Orientation Protocol</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleRotate(90)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-black hover:brightness-95 rounded-[32px] transition-all disabled:opacity-50 group border-none shadow-sm"
                                >
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        <RotateCw size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        90° Right
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleRotate(180)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-black hover:brightness-95 rounded-[32px] transition-all disabled:opacity-50 group border-none shadow-sm"
                                >
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        <RotateCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        180° Invert
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleRotate(270)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-black hover:brightness-95 rounded-[32px] transition-all disabled:opacity-50 group border-none shadow-sm"
                                >
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        <RotateCw size={24} className="group-hover:-rotate-90 transition-transform duration-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        90° Left
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleRotate(0)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-black hover:brightness-95 rounded-[32px] transition-all disabled:opacity-50 group border-none shadow-sm"
                                >
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        <RotateCw size={24} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        Reset
                                    </span>
                                </button>
                            </div>
                        </div>

                        {isProcessing && (
                            <div className="flex items-center justify-center gap-3 p-6 bg-black dark:bg-white text-white dark:text-black rounded-[28px] shadow-2xl">
                                <Loader2 className="animate-spin" size={20} />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                                    Aligning Protocol...
                                </span>
                            </div>
                        )}
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
                        operation="Rotate Pages"
                        fileName={processedFile.name}
                        originalSize={file?.size}
                        finalSize={processedFile.size}
                        onViewFiles={() => {
                            setShowSuccessModal(false);
                            setFile(null);
                            setPageCount(0);
                            navigate('/my-files');
                        }}
                        onDownload={() => {
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

export default RotateScreen;
