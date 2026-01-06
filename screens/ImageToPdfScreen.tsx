
import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Image as ImageIcon, Plus, Trash2, Download, Loader2, GripVertical, FileUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { imageToPdf, downloadBlob } from '../services/pdfService';
import { FileItem } from '../types';
import ToolGuide from '../components/ToolGuide';

const ImageToPdfScreen: React.FC = () => {
  const location = useLocation();
  const [items, setItems] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if we arrived with a captured image from the scanner
    const state = location.state as { capturedImage?: string } | null;
    if (state?.capturedImage) {
      const handleIncomingScan = async () => {
        try {
          // Convert base64 data URL to a File object
          const res = await fetch(state.capturedImage!);
          const blob = await res.blob();
          const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

          const newItem: FileItem = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            size: file.size,
            type: file.type
          };

          setItems(prev => [...prev, newItem]);
          // Clean up state to prevent duplicate imports on refresh
          window.history.replaceState({}, document.title);
        } catch (err) {
          console.error("Failed to import scan:", err);
        }
      };
      handleIncomingScan();
    }
  }, [location]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = (Array.from(e.target.files) as File[]).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type
      }));
      setItems(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setItems(prev => prev.filter(f => f.id !== id));
  };

  const handleConvert = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      const result = await imageToPdf(items.map(f => f.file));
      downloadBlob(result, `scanned_doc_${Date.now()}.pdf`, 'application/pdf');
    } catch (err) {
      console.error('Conversion error:', err);
      alert(err instanceof Error ? err.message : 'Error converting images to PDF');
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
          <div className="text-technical">Protocol Assets / Visual Aggregation</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Compile</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Aggregate tactical visual assets into unified document containers</p>
        </div>

        <ToolGuide
          title="Visual Aggregation Protocol"
          description="Synthesize unified PDF carriers from isolated image assets. Compile multiple visual streams into a single document structure."
          steps={[
            "Initialize the asset load by selecting image files (JPEG, PNG).",
            "Organize the compile order using the spatial reorder system.",
            "Analyze and prepare the visual assets for document synthesis.",
            "Execute Compilation to generate the unified PDF payload."
          ]}
          useCases={[
            "Document Digitization", "Portfolio Compilation", "Image Archival", "Receipt Aggregation"
          ]}
        />
      </div>

      <div className="space-y-8">
        <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
          <motion.div
            whileHover={{ scale: 1.1, y: -5 }}
            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
          >
            <Plus size={32} />
          </motion.div>
          <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Asset Load</span>
          <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">JPEG / PNG / RAW</span>
          <input type="file" multiple accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
        </label>

        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
          {items.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              className="flex items-center p-3 bg-white rounded-3xl border border-slate-100 shadow-sm gap-4 group cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={16} className="text-slate-300 group-active:text-rose-500" />

              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                <img
                  src={URL.createObjectURL(item.file)}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{(item.size / 1024).toFixed(0)} KB</p>
              </div>

              <button
                onClick={() => removeFile(item.id)}
                className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <button
        disabled={items.length === 0 || isProcessing}
        onClick={handleConvert}
        className={`w-full h-16 rounded-[24px] font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-3 ${items.length === 0 || isProcessing
          ? 'bg-slate-200 shadow-none'
          : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:scale-[1.02] active:scale-[0.98]'
          }`}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <>
            <Download size={20} />
            Generate PDF ({items.length})
          </>
        )}
      </button>
    </motion.div>
  );
};

export default ImageToPdfScreen;
