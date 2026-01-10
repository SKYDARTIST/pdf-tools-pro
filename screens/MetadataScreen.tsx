import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, FileText, Download, Loader2, Info, Calendar, User, Tag } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadFile } from '../services/downloadService';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import ShareModal from '../components/ShareModal';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';

const MetadataScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [subject, setSubject] = useState('');
    const [keywords, setKeywords] = useState('');
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

            // Load existing metadata
            try {
                const arrayBuffer = await f.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);

                setTitle(pdfDoc.getTitle() || '');
                setAuthor(pdfDoc.getAuthor() || '');
                setSubject(pdfDoc.getSubject() || '');
                setKeywords(pdfDoc.getKeywords() || '');
            } catch (err) {
                console.error('Error loading metadata:', err);
            }
        }
    };

    const handleSaveMetadata = async () => {
        if (!file) return;

        if (!TaskLimitManager.canUseTask()) {
            setShowUpgradeModal(true);
            return;
        }

        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            // Update metadata
            if (title) pdfDoc.setTitle(title);
            if (author) pdfDoc.setAuthor(author);
            if (subject) pdfDoc.setSubject(subject);

            // Correctly parse keywords string into a sanitized array
            if (keywords) {
                const keywordsArray = keywords
                    .split(',')
                    .map(kw => kw.trim())
                    .filter(kw => kw.length > 0);
                pdfDoc.setKeywords(keywordsArray);
            }

            pdfDoc.setProducer('PDF Tools Pro');
            pdfDoc.setCreator('PDF Tools Pro');
            pdfDoc.setCreationDate(new Date());
            pdfDoc.setModificationDate(new Date());

            const pdfBytes = await pdfDoc.save();
            const fileName = `metadata_${file.name}`;

            setProcessedFile({
                data: pdfBytes,
                name: fileName,
                size: pdfBytes.length
            });

            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            await downloadFile(blob, fileName);

            FileHistoryManager.addEntry({
                fileName,
                operation: 'metadata',
                originalSize: file.size,
                finalSize: pdfBytes.length,
                status: 'success'
            });

            setShowSuccessModal(true);
            TaskLimitManager.incrementTask();
            // Reset deferred
        } catch (err) {
            alert('Error updating metadata: ' + (err instanceof Error ? err.message : 'Unknown error'));

            FileHistoryManager.addEntry({
                fileName: `metadata_failed_${file.name}`,
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
                    <div className="text-technical">Protocol Assets / Information Architecture</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Meta</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Inject and modify bit-level information markers within the asset header</p>
                </div>

                <ToolGuide
                    title="Archetype Editing Protocol"
                    description="Modify the hidden document identity markers. Inject and update critical bit-level headers within the PDF carrier."
                    steps={[
                        "Initialize the meta-extraction by uploading a PDF carrier.",
                        "System retrieves existing identity markers (Title, Originator, Subject).",
                        "Inject new bit-level identifiers into the marker definition fields.",
                        "Execute Injection to permanently synchronize the archetypal metadata."
                    ]}
                    useCases={[
                        "Document SEO", "Version History Control", "Ownership Labeling", "File Classification Optimization"
                    ]}
                />
            </div>

            {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                    >
                        <Info size={32} />
                    </motion.div>
                    <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Extraction</span>
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
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Injection</p>
                        </div>
                        <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                            Change
                        </button>
                    </motion.div>

                    {/* Metadata Fields */}
                    <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none space-y-8">
                        <div className="flex items-center gap-3">
                            <Tag size={14} className="text-black dark:text-white" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Marker Definition</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Title */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Asset Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="TITLE_MARKER..."
                                    className="w-full h-14 px-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                                />
                            </div>

                            {/* Author */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Originator</label>
                                <input
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="ORIGIN_MARKER..."
                                    className="w-full h-14 px-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                                />
                            </div>

                            {/* Subject */}
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Subject Scope</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="SCOPE_MARKER..."
                                    className="w-full h-14 px-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                                />
                            </div>

                            {/* Keywords */}
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Key Identifiers</label>
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    placeholder="KEYWORD_STREAM..."
                                    className="w-full h-14 px-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveMetadata}
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
                                <span>Execute Injection</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Success Modal */}
            {processedFile && (
                <>
                    <SuccessModal
                        isOpen={showSuccessModal}
                        onClose={() => {
                            setShowSuccessModal(false);
                            setFile(null);
                            setTitle('');
                            setAuthor('');
                            setSubject('');
                            setKeywords('');
                        }}
                        operation="Update Metadata"
                        fileName={processedFile.name}
                        originalSize={file?.size}
                        finalSize={processedFile.size}
                        onViewFiles={() => {
                            setShowSuccessModal(false);
                            setFile(null);
                            setTitle('');
                            setAuthor('');
                            setSubject('');
                            setKeywords('');
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

export default MetadataScreen;
