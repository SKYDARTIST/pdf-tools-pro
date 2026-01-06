import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Image as ImageIcon, Download, Loader2, FileText, Package } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import ToolGuide from '../components/ToolGuide';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ExtractImagesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedImages, setExtractedImages] = useState<string[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setExtractedImages([]);
        }
    };

    const handleExtractImages = async () => {
        if (!file) return;

        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const images: string[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport, canvasFactory: undefined } as any).promise;
                    const imageData = canvas.toDataURL('image/png');
                    images.push(imageData);
                }
            }

            setExtractedImages(images);

            // Add to history
            FileHistoryManager.addEntry({
                fileName: `extracted_images_${file.name}`,
                operation: 'split',
                originalSize: file.size,
                finalSize: images.length * 100000, // Approximate
                status: 'success'
            });

            setShowSuccessModal(true);
        } catch (err) {
            alert('Error extracting images: ' + (err instanceof Error ? err.message : 'Unknown error'));

            FileHistoryManager.addEntry({
                fileName: `extract_images_failed_${file.name}`,
                operation: 'split',
                status: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadImage = (imageData: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `page_${index + 1}.png`;
        link.click();
    };

    const downloadAllImages = () => {
        extractedImages.forEach((img, index) => {
            setTimeout(() => downloadImage(img, index), index * 100);
        });
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
                    <div className="text-technical">Protocol Assets / Visual Extraction</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Images</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Identify and decouple tactical visual assets from the document carrier</p>
                </div>

                <ToolGuide
                    title="Visual Asset Isolation"
                    description="Decouple embedded images from the PDF carrier. Identify and extract tactical visual assets for isolated usage."
                    steps={[
                        "Initialize the extraction protocol by uploading a PDF carrier.",
                        "System performs a visual scan to identify tactical image assets within the pages.",
                        "Embedded image layers are identified for decoupling from the document structure.",
                        "Execute Extraction to isolate and download the visual payloads."
                    ]}
                    useCases={[
                        "Image Harvesting", "Asset Decoupling", "Visual Content Management", "Portfolio Assembly"
                    ]}
                />
            </div>

            {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                    <motion.div
                        whileHover={{ scale: 1.1, y: -5 }}
                        className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                    >
                        <ImageIcon size={32} />
                    </motion.div>
                    <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Extraction</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Visual Scan Mode</span>
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
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {extractedImages.length > 0 ? `${extractedImages.length} ASSETS DECOUPLED` : 'AWAITING SCAN'}
                            </p>
                        </div>
                        <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                            Change
                        </button>
                    </motion.div>

                    {/* Extract Button */}
                    {extractedImages.length === 0 && (
                        <button
                            onClick={handleExtractImages}
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
                                    <ImageIcon size={18} strokeWidth={3} />
                                    <span>Execute Extraction</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Extracted Images Grid */}
                    {extractedImages.length > 0 && (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Extracted Images ({extractedImages.length})
                                </h3>
                                <button
                                    onClick={downloadAllImages}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs transition-colors"
                                >
                                    <Package size={16} />
                                    Download All
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {extractedImages.map((img, index) => (
                                    <div
                                        key={index}
                                        className="relative group bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                                    >
                                        <img
                                            src={img}
                                            alt={`Page ${index + 1}`}
                                            className="w-full h-auto"
                                        />
                                        <button
                                            onClick={() => downloadImage(img, index)}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <Download size={24} className="text-white" />
                                        </button>
                                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                                            Page {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )
            }

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                operation="Extract Images"
                fileName={file?.name || ''}
                metadata={{ imagesConverted: extractedImages.length }}
                onViewFiles={() => {
                    setShowSuccessModal(false);
                    navigate('/my-files');
                }}
            />
        </motion.div>
    );
};

export default ExtractImagesScreen;
