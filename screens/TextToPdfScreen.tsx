
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Type, Download, Loader2, AlignLeft, Bold } from 'lucide-react';
import { createPdfFromText, downloadBlob } from '../services/pdfService';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';
import FileHistoryManager from '../utils/FileHistoryManager';

const TextToPdfScreen: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleGenerate = async () => {
    if (!title || !content) return;

    if (!TaskLimitManager.canUseTask()) {
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createPdfFromText(title, content);
      const fileName = `${title.replace(/\s+/g, '_')}.pdf`;
      downloadBlob(result, fileName, 'application/pdf');

      // Increment task count
      TaskLimitManager.incrementTask();

      // Record in history
      FileHistoryManager.addEntry({
        fileName,
        operation: 'merge', // or create-pdf
        originalSize: content.length,
        finalSize: result.length,
        status: 'success'
      });

      // Clear
      setTitle('');
      setContent('');
    } catch (err) {
      alert('Error generating PDF');
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
          <div className="text-technical">Protocol Assets / Lexical Synthesis</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Draft</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Synthesize tactical document structures from raw lexical input</p>
        </div>

        <ToolGuide
          title="Data Synthesis Protocol"
          description="Synthesize tactical document structures from raw lexical input. Convert unstructured text streams into premium PDF asset carriers."
          steps={[
            "Define the unique document identifier (Title) for the asset header.",
            "Initialize the lexical stream by entering raw text data into the terminal.",
            "System formats the raw lexical input into a standardized document layer.",
            "Execute Synthesis to finalize the PDF asset carrier and download the payload."
          ]}
          useCases={[
            "Rapid Memo Generation", "Lexical Data Archival", "Note Conversion", "Structured Text Serialization"
          ]}
        />

        <div className="space-y-8 flex-1 flex flex-col">
          <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none shadow-xl flex-1 flex flex-col space-y-6">
            <div className="flex items-center gap-4 border-b border-black/5 dark:border-white/5 pb-4">
              <Bold size={14} className="text-gray-400" />
              <AlignLeft size={14} className="text-gray-400" />
              <div className="w-[2px] h-4 bg-black/10 dark:bg-white/10" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Operational Terminal</span>
            </div>

            <input
              type="text"
              placeholder="DOC_IDENTIFIER..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-black text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent focus:outline-none uppercase tracking-tighter"
            />

            <textarea
              placeholder="INITIALIZE_LEXICAL_STREAM..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full flex-1 text-[13px] text-gray-600 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent focus:outline-none resize-none leading-relaxed font-medium min-h-[300px] custom-scrollbar"
            />
          </div>

          <button
            disabled={!title || !content || isProcessing}
            onClick={handleGenerate}
            className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!title || !content || isProcessing
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
                <span>Execute Synthesis</span>
              </>
            )}
          </button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="limit_reached"
      />
    </motion.div>
  );
};

export default TextToPdfScreen;
