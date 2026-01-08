import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, GitMerge, ListCheck, Loader2, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { askGemini } from '../services/aiService';
import { canUseAI, recordAIUsage } from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import UpgradeModal from '../components/UpgradeModal';
import ToolGuide from '../components/ToolGuide';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';

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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileNum: 1 | 2) => {
        if (e.target.files && e.target.files[0]) {
            if (fileNum === 1) setFile1(e.target.files[0]);
            else setFile2(e.target.files[0]);
            setDiffResult('');
            setError('');
        }
    };

    const runNeuralDiff = async () => {
        if (!file1 || !file2) return;

        if (!hasConsent) {
            setShowConsent(true);
            return;
        }

        const aiCheck = canUseAI();
        if (!aiCheck.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            // Extract text from both
            const text1 = await extractTextFromPdf(await file1.arrayBuffer());
            const text2 = await extractTextFromPdf(await file2.arrayBuffer());

            // Analyze with Gemini
            const prompt = `Perform a semantic comparison between these two document versions. 
            VERSION 1: ${text1.substring(0, 5000)}
            VERSION 2: ${text2.substring(0, 5000)}
            
            Identify key differences in:
            1. Legal Terms & Obligations
            2. Numerical changes (Prices, Dates)
            3. New Additions or Deletions
            
            Format the output with bold headers and bullet points. Focus on risk and semantic changes.`;

            const response = await askGemini(prompt, "Comparing two document versions.", "diff");
            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                return;
            }
            setDiffResult(response);
            await recordAIUsage();
        } catch (err) {
            setError("Analysis failed. Ensure both files are readable PDFs.");
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen pb-32 pt-32 max-w-4xl mx-auto px-6"
        >
            <div className="space-y-12">
                <div className="space-y-3">
                    <div className="text-technical">Neural Lab / Comparison Protocol</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Neural Diff</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Identify semantic variations between document versions with Edge-AI
                    </p>
                </div>

                <ToolGuide
                    title="Semantic Comparison Protocol"
                    description="Perform a deep semantic analysis between two document versions. Identify critical variations in legal obligations and numerical data."
                    steps={[
                        "Initialize the comparison by uploading two versions of the document (Base vs Modified).",
                        "The Neural Lab extracts textual data streams from both carriers.",
                        "Gemini AI performs a semantic diff to identify risks, omissions, and additions.",
                        "Analyze the 'Semantic Analysis Ready' report for critical variations."
                    ]}
                    useCases={[
                        "Contract Review", "Legal Comparison", "Version Control Auditing", "Price Change Verification"
                    ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* File 1 */}
                    <label className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[40px] cursor-pointer transition-all h-64 ${file1 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${file1 ? 'bg-emerald-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
                            {file1 ? <Check size={24} /> : <FileUp size={24} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">
                            {file1 ? file1.name : "Version 1 (Base)"}
                        </span>
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 1)} />
                    </label>

                    {/* File 2 */}
                    <label className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[40px] cursor-pointer transition-all h-64 ${file2 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${file2 ? 'bg-emerald-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
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
                            className="bg-black dark:bg-white text-white dark:text-black px-12 py-6 rounded-[32px] text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl"
                        >
                            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <GitMerge size={18} />}
                            {isAnalyzing ? "Executing Analysis..." : "Execute Neural Diff"}
                        </motion.button>
                    </div>
                )}

                {error && (
                    <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-4 text-rose-500">
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
                                    <span className="text-xs font-black uppercase tracking-widest">Semantic Analysis Ready</span>
                                </div>
                                <button
                                    onClick={() => setShowReport(true)}
                                    className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors flex items-center gap-2 mr-2"
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
                                <button className="flex-1 py-4 bg-black/5 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                    Export PDF Report
                                </button>
                                <button
                                    onClick={() => navigate('/workspace')}
                                    className="flex-1 py-4 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
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
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
            />
        </motion.div >
    );
};

export default NeuralDiffScreen;
