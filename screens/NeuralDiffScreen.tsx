import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, GitMerge, ListCheck, Loader2, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { askGemini } from '../services/aiService';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import AiLimitModal from '../components/AiLimitModal';
import ToolGuide from '../components/ToolGuide';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag, Share2 } from 'lucide-react';
import { createPdfFromText } from '../services/pdfService';
import { useAuthGate } from '../hooks/useAuthGate';
import { AuthModal } from '../components/AuthModal';
import { getCurrentUser } from '../services/googleAuthService';
import { initSubscription } from '../services/subscriptionService';
import { downloadFile } from '../services/downloadService';
import SuccessModal from '../components/SuccessModal';

const NeuralDiffScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [diffResult, setDiffResult] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isCooling, setIsCooling] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [showAiLimit, setShowAiLimit] = useState(false);
    const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any; used: number; limit: number }>({ blockMode: null, used: 0, limit: 0 });
    const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);
    const { authModalOpen, setAuthModalOpen, requireAuth, handleAuthSuccess } = useAuthGate();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileNum: 1 | 2) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            try {
                // Read file data immediately to prevent Android permission expiration
                const arrayBuffer = await f.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: f.type });
                const freshFile = new File([blob], f.name, { type: f.type });
                if (fileNum === 1) setFile1(freshFile);
                else setFile2(freshFile);
                setDiffResult('');
                setError('');
            } catch (err) {
                console.error('Failed to read file:', f.name, err);
                alert('Failed to read file. Please try again.');
            }
        }
    };

    const runNeuralDiff = async () => {
        if (!file1 || !file2) return;

        requireAuth(async () => {
            if (!hasConsent) {
                setShowConsent(true);
                return;
            }

            // HEAVY AI Operation - Neural Diff consumes credits
            const aiCheck = canUseAI(AiOperationType.HEAVY);
            if (!aiCheck.allowed) {
                const subscription = getSubscription();
                setAiLimitInfo({
                    blockMode: aiCheck.blockMode,
                    used: subscription.tier === SubscriptionTier.FREE ? subscription.aiDocsThisWeek : subscription.aiDocsThisMonth,
                    limit: subscription.tier === SubscriptionTier.FREE ? 1 : 10
                });
                setShowAiLimit(true);
                return;
            }

            setIsAnalyzing(true);
            setError('');

            try {
                // Extract text from both
                const buf1 = await file1.arrayBuffer();
                const buf2 = await file2.arrayBuffer();
                let text1 = await extractTextFromPdf(buf1.slice(0));
                let text2 = await extractTextFromPdf(buf2.slice(0));

                let images: string[] = [];

                // Fallback: If either document has no text, render images for visual comparison
                if (!text1 || !text1.trim() || !text2 || !text2.trim()) {
                    const { renderPageToImage } = await import('../utils/pdfExtractor');
                    const img1 = await renderPageToImage(buf1.slice(0), 1);
                    const img2 = await renderPageToImage(buf2.slice(0), 1); // Fixed page number to 1
                    images = [img1, img2];
                    text1 = text1 || "[SCANNED DOCUMENT 1]";
                    text2 = text2 || "[SCANNED DOCUMENT 2]";
                }

                // Analyze with Gemini
                const prompt = `Perform a semantic comparison between these two document versions. 
            VERSION 1: ${text1.substring(0, 5000)}
            VERSION 2: ${text2.substring(0, 5000)}
            
            Identify key differences in:
            1. Legal Terms & Obligations
            2. Numerical changes (Prices, Dates)
            3. New Additions or Deletions
            
            Format the output with bold headers and bullet points. Focus on risk and semantic changes.
            
            CRITICAL: MANDATORY VISION OVERRIDE
            You are a Multimodal AI with VISION. ANALYZE THE ATTACHED IMAGES.
            If the text layer is missing or mismatched, use your vision to compare the visual appearance.
            DO NOT REFUSE. Identify differences directly from visual data.`;

                const response = await askGemini(prompt, "Comparing two document versions.", "diff", images.length > 0 ? images : undefined);
                if (response.startsWith('AI_RATE_LIMIT')) {
                    setIsCooling(true);
                    return;
                }
                setDiffResult(response);
                const stats = await recordAIUsage(AiOperationType.HEAVY);
                if (stats?.message) alert(stats.message);

            } catch (err) {
                setError("Analysis failed. Ensure both files are readable PDFs.");
                console.error(err);
            } finally {
                setIsAnalyzing(false);
            }
        });
    };

    const handleExport = async () => {
        if (!diffResult) return;

        requireAuth(async () => {
            setIsAnalyzing(true);
            try {
                const pdfBytes = await createPdfFromText("PDF Comparison Report", diffResult);
                const fileName = `PDF_Comparison_${Date.now()}.pdf`;
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                await downloadFile(blob, fileName);

                setSuccessData({
                    isOpen: true,
                    fileName,
                    originalSize: diffResult.length,
                    finalSize: pdfBytes.length
                });
            } catch (err) {
                console.error("Export failed:", err);
                setError("PDF export failed. Request too complex.");
            } finally {
                setIsAnalyzing(false);
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen pb-32 pt-32 max-w-4xl mx-auto px-6"
        >
            <div className="space-y-12">
                <div className="space-y-3">
                    <div className="text-technical">AI Tools / Compare Documents</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Compare</h1>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">
                        Find key differences and changes between two document versions with AI
                    </p>
                </div>

                <ToolGuide
                    title="How to compare documents"
                    description="Upload two versions of a document to see what changed. Our AI will highlight legal updates, price changes, and new or deleted text."
                    steps={[
                        "Upload the original version (Version 1).",
                        "Upload the modified version (Version 2).",
                        "Our AI analyzes the text in both documents.",
                        "Review the comparison report for important changes."
                    ]}
                    useCases={[
                        "Contract Review", "Legal Comparison", "Version History", "Price Check"
                    ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* File 1 */}
                    <label className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[40px] cursor-pointer transition-all h-64 ${file1 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-xl ${file1 ? 'bg-emerald-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
                            {file1 ? <Check size={24} /> : <FileUp size={24} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">
                            {file1 ? file1.name : "Version 1 (Base)"}
                        </span>
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 1)} />
                    </label>

                    {/* File 2 */}
                    <label className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[40px] cursor-pointer transition-all h-64 ${file2 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-xl ${file2 ? 'bg-emerald-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
                            {file2 ? <Check size={24} /> : <FileUp size={24} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">
                            {file2 ? file2.name : "Version 2 (Modified)"}
                        </span>
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 2)} />
                    </label>
                </div>

                {file1 && file2 && !diffResult && (
                    <div className="flex justify-center">
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={runNeuralDiff}
                            disabled={isAnalyzing}
                            className="bg-black dark:bg-white text-white dark:text-black px-12 py-6 rounded-full text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl"
                        >
                            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <GitMerge size={18} />}
                            {isAnalyzing ? "Analyzing Changes..." : "Start AI Comparison"}
                        </motion.button>
                    </div>
                )}

                {error && (
                    <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-4 text-rose-500">
                        <AlertCircle size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                    </div>
                )}

                <AnimatePresence>
                    {diffResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="monolith-card p-12 space-y-8"
                        >
                            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles size={20} className="text-emerald-500" />
                                    <span className="text-xs font-black uppercase tracking-widest">Comparison Report Ready</span>
                                </div>
                                <button
                                    onClick={() => setShowReport(true)}
                                    className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-full transition-colors flex items-center gap-2 mr-2"
                                    title="Report AI Content"
                                >
                                    <Flag size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Flag</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setFile1(null);
                                        setFile2(null);
                                        setDiffResult('');
                                    }}
                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X size={18} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {diffResult.split('\n').map((line, i) => (
                                    <p key={i} className="text-[13px] font-medium leading-relaxed mb-1 whitespace-pre-wrap">
                                        {line}
                                    </p>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-4">
                                <button
                                    onClick={handleExport}
                                    className="flex-1 py-4 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Share2 size={14} />
                                    Share PDF Report
                                </button>
                                <button
                                    onClick={() => navigate('/workspace')}
                                    className="flex-1 py-4 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                                >
                                    Finish Task
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
                    runNeuralDiff();
                }}
            />

            <AIReportModal
                isOpen={showReport}
                onClose={() => setShowReport(false)}
            />
            <AiLimitModal
                isOpen={showAiLimit}
                onClose={() => setShowAiLimit(false)}
                blockMode={aiLimitInfo.blockMode}
                used={aiLimitInfo.used}
                limit={aiLimitInfo.limit}
            />

            {successData && (
                <SuccessModal
                    isOpen={successData.isOpen}
                    onClose={() => {
                        setSuccessData(null);
                        setFile1(null);
                        setFile2(null);
                        setDiffResult('');
                    }}
                    operation="Compare PDFs"
                    fileName={successData.fileName}
                    originalSize={successData.originalSize}
                    finalSize={successData.finalSize}
                    onViewFiles={() => {
                        navigate('/my-files');
                    }}
                />
            )}

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onSuccess={handleAuthSuccess}
            />
        </motion.div >
    );
};

export default NeuralDiffScreen;
