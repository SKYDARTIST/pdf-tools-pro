import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ReaderScreen: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPageNumber(1);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const goToPrevPage = () => {
        setPageNumber((prev) => Math.max(prev - 1, 1));
    };

    const goToNextPage = () => {
        setPageNumber((prev) => Math.min(prev + 1, numPages));
    };

    const zoomIn = () => {
        setScale((prev) => Math.min(prev + 0.2, 3.0));
    };

    const zoomOut = () => {
        setScale((prev) => Math.max(prev - 0.2, 0.5));
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
                    <div className="text-technical">Protocol Assets / Linear Reading</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Read</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Execute sequential data interpretation via high-fidelity document rendering</p>
                </div>

                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                        <motion.div
                            whileHover={{ scale: 1.1, y: -5 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                        >
                            <BookOpen size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Reader</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Sequential Scan Mode</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="space-y-8">
                        {/* Controls */}
                        <div className="flex items-center justify-between monolith-card p-6 border-none shadow-xl">
                            {/* Page Navigation */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={goToPrevPage}
                                    disabled={pageNumber <= 1}
                                    className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                >
                                    <ChevronLeft size={20} className="text-gray-900 dark:text-white" />
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white min-w-[80px] text-center">
                                    {pageNumber} / {numPages}
                                </span>
                                <button
                                    onClick={goToNextPage}
                                    disabled={pageNumber >= numPages}
                                    className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                >
                                    <ChevronRight size={20} className="text-gray-900 dark:text-white" />
                                </button>
                            </div>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={zoomOut}
                                    disabled={scale <= 0.5}
                                    className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                >
                                    <ZoomOut size={20} className="text-gray-900 dark:text-white" />
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white min-w-[50px] text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={zoomIn}
                                    disabled={scale >= 3.0}
                                    className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                >
                                    <ZoomIn size={20} className="text-gray-900 dark:text-white" />
                                </button>
                            </div>

                            {/* Close */}
                            <button
                                onClick={() => setFile(null)}
                                className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* PDF Viewer */}
                        <div className="monolith-card bg-gray-100 dark:bg-black border-none shadow-2xl p-8 flex items-center justify-center min-h-[500px] overflow-auto custom-scrollbar">
                            <Document
                                file={file}
                                onLoadSuccess={onDocumentLoadSuccess}
                                className="flex items-center justify-center"
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    className="shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5"
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    loading={<div className="w-full h-96 bg-black/5 dark:bg-white/5 animate-pulse rounded-2xl" />}
                                />
                            </Document>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ReaderScreen;
