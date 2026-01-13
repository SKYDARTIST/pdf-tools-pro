import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Image as ImageIcon, Share2, Loader2, FileText, Package } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';
import { downloadFile, downloadMultipleFiles, saveBase64ToCache } from '../services/downloadService';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ExtractImagesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedAssets, setExtractedAssets] = useState<{ uri: string; displayUrl: string }[]>([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

    // NO OP: Filesystem assets are permanent until app is closed or cleared
    React.useEffect(() => {
        return () => {
            // Cleanup if needed
        };
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            try {
                // Read file data immediately to prevent Android permission expiration
                const arrayBuffer = await f.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: f.type });
                const freshFile = new File([blob], f.name, { type: f.type });
                setFile(freshFile);
                // Cleanup old ObjectURLs
                extractedAssets.forEach(asset => URL.revokeObjectURL((asset as any).url));
                setExtractedAssets([]);
            } catch (err) {
                console.error('Failed to read file:', f.name, err);
                alert('Failed to read file. Please try again.');
            }
        }
    };

    const handleExtractImages = async () => {
        if (!file) return;

        if (!TaskLimitManager.canUseTask()) {
            setShowUpgradeModal(true);
            return;
        }

        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const assets: { uri: string; displayUrl: string }[] = [];
            console.log("🛠️ Starting visual scan of carrier:", pdf.numPages, "pages identified.");

            for (let i = 1; i <= pdf.numPages; i++) {
                console.log(`📸 Processing layer ${i}/${pdf.numPages}...`);
                const page = await pdf.getPage(i);

                // HIGH QUALITY: Use scale 1.5 for a perfect balance of crispness and stability
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport, canvasFactory: undefined } as any).promise;

                    // HIGH QUALITY: Use JPEG at 85% quality (Industry standard for mobile docs)
                    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

                    // Force browser garbage collection by clearing canvas
                    canvas.width = 0;
                    canvas.height = 0;

                    // Atomic Save to Disk (Frees up RAM immediately)
                    const fileName = `page_${i}.jpg`;
                    const uri = await saveBase64ToCache(base64, fileName);

                    assets.push({
                        uri,
                        displayUrl: Capacitor.convertFileSrc(uri)
                    });

                    console.log(`✅ Layer ${i} saved to disk. Memory cleared.`);
                }
            }

            setExtractedAssets(assets);

            // Add to history
            FileHistoryManager.addEntry({
                fileName: `extracted_images_${file.name}`,
                operation: 'split',
                originalSize: file.size,
                finalSize: assets.length * 100000, // Approximate
                status: 'success'
            });

            // Increment task count
            TaskLimitManager.incrementTask();

            // Show success modal
            setSuccessData({
                isOpen: true,
                fileName: `extracted_images_${file.name}`,
                originalSize: file.size,
                finalSize: assets.length * 102400 // Estimate 100kb per image for UI
            });
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

    const downloadImage = async (uri: string, index: number) => {
        try {
            await Share.share({
                title: 'Anti-Gravity Asset',
                url: uri,
                dialogTitle: 'Save Asset'
            });
        } catch (err) {
            console.error("Failed to share image:", err);
        }
    };

    const downloadAllImages = async () => {
        if (extractedAssets.length === 0) return;
        setIsProcessing(true);
        try {
            console.log("📂 Sending images to system share...");

            // On Mobile, we use the Native Share sheet for the whole collection
            const uris = extractedAssets.map(a => a.uri);

            await Share.share({
                title: `${uris.length} Extracted Images`,
                files: uris,
                dialogTitle: 'Save All Assets'
            });

            setSuccessData(null);
        } catch (err) {
            console.error("❌ Multi-download failed:", err);
            alert("Failed to package assets. The collection might be too large for the system bridge.");
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
                    <div className="text-technical">Available Tools / Extract Images</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Images</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">Find and save all images from your PDF as separate files</p>
                </div>

                <ToolGuide
                    title="How to extract images"
                    description="Automatically find all pictures and photos inside your PDF. You can then download them individually or all at once."
                    steps={[
                        "Upload the PDF you want to scan for images.",
                        "Our tool scans every page of your document.",
                        "We identify all the photos and graphics found inside.",
                        "Tap 'Extract' to save the images to your device."
                    ]}
                    useCases={[
                        "Saving Photos", "Pulling Graphics", "Image Harvesting", "Document Assets"
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
                    <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Tap to upload PDF</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Scanning for images</span>
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
                                {extractedAssets.length > 0 ? `${extractedAssets.length} IMAGES FOUND` : 'AWAITING SCAN'}
                            </p>
                        </div>
                        <button onClick={() => {
                            setFile(null);
                            setExtractedAssets([]);
                        }} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                            Change
                        </button>
                    </motion.div>

                    {/* Extract Button */}
                    {extractedAssets.length === 0 && (
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
                                    <span>Extract All Images</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Extracted Images Grid */}
                    {extractedAssets.length > 0 && (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Extracted Images ({extractedAssets.length})
                                </h3>
                                <button
                                    onClick={downloadAllImages}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs transition-colors"
                                >
                                    <Package size={16} />
                                    Share All
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {extractedAssets.map((asset, index) => (
                                    <div
                                        key={index}
                                        className="relative group bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                                    >
                                        <img
                                            src={asset.displayUrl}
                                            alt={`Page ${index + 1}`}
                                            className="w-full h-auto"
                                        />
                                        <button
                                            onClick={() => downloadImage(asset.uri, index)}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <Share2 size={24} className="text-white" />
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
            {successData && (
                <SuccessModal
                    isOpen={successData.isOpen}
                    operation="Extract Images"
                    fileName={successData.fileName}
                    originalSize={successData.originalSize}
                    finalSize={successData.finalSize}
                    metadata={{ imagesConverted: extractedAssets.length }}
                    onViewFiles={() => {
                        setSuccessData(null);
                        navigate('/my-files');
                    }}
                    onDownload={downloadAllImages}
                    onClose={() => {
                        setSuccessData(null);
                    }}
                />
            )}

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                reason="limit_reached"
            />
        </motion.div>
    );
};

export default ExtractImagesScreen;
