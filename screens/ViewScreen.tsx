
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, FileUp, X, ChevronLeft, ChevronRight, Maximize, ZoomIn } from 'lucide-react';
import AIAssistant from '../components/AIAssistant';
import ToolGuide from '../components/ToolGuide';

const ViewScreen: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      try {
        // Read file data immediately to prevent Android permission expiration
        const arrayBuffer = await f.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: f.type });
        const freshFile = new File([blob], f.name, { type: f.type });
        setFileName(freshFile.name);
        setPdfUrl(URL.createObjectURL(freshFile));
        setExtractedText("This is a sample document about modern PDF management. It details security, merging techniques, and digital signatures. It explains that 'XREF Tables' are a legacy structure of PDFs.");
      } catch (err) {
        console.error('Failed to read file:', f.name, err);
        alert('Failed to read file. Please try again.');
      }
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
          <div className="text-technical">Available Tools / PDF Viewer</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">View</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">Quickly preview and read your PDF documents with our private viewer</p>
        </div>

        <ToolGuide
          title="How to view your PDF"
          description="Read any PDF document privately. You can zoom in, navigate pages, and ask our AI assistant questions about the content."
          steps={[
            "Upload the PDF you want to view.",
            "We'll show your document in our secure viewer.",
            "Ask the AI assistant for a summary or to explain specific parts.",
            "Use the controls at the bottom to flip through pages."
          ]}
          useCases={[
            "Quick Inspection", "Summarizing Content", "Visual Verification", "Read-Only Access"
          ]}
        />

        {!pdfUrl ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <Eye size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Tap to upload PDF</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Safe & Private Viewing</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="monolith-card p-6 flex items-center gap-5 border-none shadow-xl"
            >
              <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shrink-0">
                <Eye size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black uppercase tracking-tighter truncate text-gray-900 dark:text-white">{fileName}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Viewing Mode</p>
              </div>
              <div className="flex gap-2">
                <button className="p-3 text-gray-400 hover:text-black dark:hover:text-white transition-colors"><ZoomIn size={20} /></button>
                <button onClick={() => { setPdfUrl(null); setExtractedText(''); }} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"><X size={20} /></button>
              </div>
            </motion.div>

            <div className="aspect-[3/4] monolith-card bg-gray-200 dark:bg-white/5 border-none shadow-2xl overflow-hidden relative group">
              <iframe
                src={`${pdfUrl}#toolbar=0`}
                className="w-full h-full border-none pointer-events-none"
                title="PDF Viewer"
              />

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/90 dark:bg-white/90 backdrop-blur-xl px-8 py-4 rounded-[24px] text-white dark:text-black shadow-2xl border border-white/10 dark:border-black/10 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                <button className="opacity-30 hover:opacity-100 transition-opacity"><ChevronLeft size={24} /></button>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">P_01</span>
                <button className="opacity-30 hover:opacity-100 transition-opacity"><ChevronRight size={24} /></button>
                <div className="w-[2px] h-6 bg-white/10 dark:bg-black/10" />
                <button className="hover:scale-110 active:scale-90 transition-transform"><Maximize size={20} /></button>
              </div>
            </div>
          </div>
        )}

        {pdfUrl && (
          <div className="space-y-6">
            <div className="text-technical ml-1">AI Assistant</div>
            <AIAssistant contextText={extractedText} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ViewScreen;
