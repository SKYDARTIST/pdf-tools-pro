import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSearch, FileUp, Copy, Check, Loader2, Edit3, Share2, RefreshCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { replaceTextInPdf } from '../utils/pdfEditor';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { downloadFile } from '../services/downloadService';

// Configure PDF.js worker - using local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ExtractTextScreen: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ chars: number; pages: number } | null>(null);

  // Direct Edit State
  const [showEdit, setShowEdit] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);
  const navigate = useNavigate();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (!TaskLimitManager.canUseTask()) {
        setShowUpgradeModal(true);
        return;
      }

      setIsProcessing(true);

      try {
        // Read file data immediately to prevent Android permission expiration
        const arrayBuffer = await selectedFile.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: selectedFile.type });
        const freshFile = new File([blob], selectedFile.name, { type: selectedFile.type });
        setFile(freshFile);
        setOriginalBuffer(arrayBuffer);

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        const numPages = pdf.numPages;

        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }

        const cleanedText = fullText
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n\n')
          .trim();

        setText(cleanedText);
        setStats({
          chars: cleanedText.length,
          pages: numPages
        });

        // Increment task count
        TaskLimitManager.incrementTask();

        // Record in history
        FileHistoryManager.addEntry({
          fileName: selectedFile.name,
          operation: 'extract-text',
          originalSize: selectedFile.size,
          status: 'success'
        });
      } catch (err) {
        console.error('Failed to read file:', selectedFile.name, err);
        alert('Error extracting text: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setText('Failed to extract text from PDF.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleApplyEdit = async () => {
    if (!originalBuffer || !findText || !replaceText || !file) return;

    if (!TaskLimitManager.canUseTask()) {
      setShowUpgradeModal(true);
      return;
    }

    setIsApplyingEdit(true);
    try {
      // Universal Replace: now handles all pages and all occurrences
      const modifiedBytes = await replaceTextInPdf(originalBuffer, findText, replaceText);
      if (modifiedBytes) {
        const blob = new Blob([modifiedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        // Show success modal
        setSuccessData({
          isOpen: true,
          fileName: `edited_${file.name}`,
          originalSize: file.size,
          finalSize: modifiedBytes.length
        });
      } else {
        alert(`No occurrences of "${findText}" found in the document.`);
      }
    } catch (error) {
      console.error(error);
      alert('Neural Modification failed.');
    } finally {
      setIsApplyingEdit(false);
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
          <div className="text-technical">Protocol Assets / Lexical Extraction</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Extract & Edit</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reconstruct readable data streams or inject modifications directly</p>
        </div>

        <ToolGuide
          title="Lexical Extraction Protocol"
          description="Identify and decouple document-based text streams. Reconstruct raw lexical data for analysis or direct modification."
          steps={[
            "Initialize the extraction protocol by uploading a PDF carrier.",
            "System performs a lexical scan to decouple character data from the document layer.",
            "Analyze the character stream in the Neural Buffer for modifications.",
            "Use the 'Direct Edit' protocol to inject global neural modifications to the carrier."
          ]}
          useCases={[
            "Content Repurposing", "Global Data Replacement", "Textual Archiving", "Document Correction"
          ]}
        />

        {!text && !isProcessing ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <FileSearch size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Extraction</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : isProcessing ? (
          <div className="h-80 flex flex-col items-center justify-center gap-6 monolith-card bg-black/5 dark:bg-white/5 border-none shadow-xl">
            <Loader2 className="animate-spin text-black dark:text-white" size={48} strokeWidth={3} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Lexical Data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats & Actions */}
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Neural Buffer</h4>
                {stats && (
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {stats.chars.toLocaleString()} BYTES • {stats.pages} SEGMENTS
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEdit(!showEdit)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${showEdit ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'}`}
                >
                  <Edit3 size={14} />
                  {showEdit ? 'Close Editor' : 'Direct Edit'}
                </button>
                <button
                  onClick={() => {
                    if (text) navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'COPIED' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Editor Panel */}
            <AnimatePresence>
              {showEdit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="monolith-card p-6 bg-emerald-500/5 border-emerald-500/20 mb-8 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Neural Injector Prototype</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Search Lexeme</label>
                        <input
                          value={findText}
                          onChange={(e) => setFindText(e.target.value)}
                          placeholder="Existing text..."
                          className="w-full bg-white dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl p-3 text-[11px] font-bold uppercase tracking-widest focus:ring-1 ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Target Injection</label>
                        <input
                          value={replaceText}
                          onChange={(e) => setReplaceText(e.target.value)}
                          placeholder="New text..."
                          className="w-full bg-white dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl p-3 text-[11px] font-bold uppercase tracking-widest focus:ring-1 ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      disabled={!findText || !replaceText || isApplyingEdit}
                      onClick={handleApplyEdit}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-20"
                    >
                      {isApplyingEdit ? <RefreshCcw className="animate-spin" size={16} /> : <Share2 size={16} />}
                      {isApplyingEdit ? 'Injecting Data...' : 'Apply Neural Inject & Share'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buffer Display */}
            <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none shadow-xl min-h-[400px] max-h-[500px] overflow-y-auto custom-scrollbar">
              <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {text}
              </p>
            </div>

            <button
              onClick={() => { setText(null); setStats(null); setFile(null); setShowEdit(false); }}
              className="w-full py-4 text-[9px] font-black text-gray-400 hover:text-gray-900 dark:hover:text-white uppercase tracking-[0.5em] transition-colors"
            >
              [ Re-Initialize Extraction ]
            </button>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="limit_reached"
      />

      {successData && (
        <SuccessModal
          isOpen={successData.isOpen}
          onClose={() => {
            setSuccessData(null);
            setText(null);
            setStats(null);
            setFile(null);
            setShowEdit(false);
          }}
          operation="Text Modification"
          fileName={successData.fileName}
          originalSize={successData.originalSize}
          finalSize={successData.finalSize}
          onViewFiles={() => {
            setSuccessData(null);
            setText(null);
            setStats(null);
            setFile(null);
            setShowEdit(false);
            navigate('/my-files');
          }}
        />
      )}
    </motion.div>
  );
};

export default ExtractTextScreen;
