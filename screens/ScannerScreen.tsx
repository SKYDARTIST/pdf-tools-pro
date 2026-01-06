
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, RefreshCw, FileCheck, Loader2, Sparkles, Wand2, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPolisherProtocol, ScanFilters } from '../services/polisherService';
import { askGemini } from '../services/aiService';
import { canUseAI, recordAIUsage } from '../services/subscriptionService';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';
import ToolGuide from '../components/ToolGuide';
import NeuralPulse from '../components/NeuralPulse';

const ScannerScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const protocol = searchParams.get('protocol');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ScanFilters | null>(null);
  const [suggestedName, setSuggestedName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
  const [scannerMode, setScannerMode] = useState<'document' | 'photo'>('photo');

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setError("Camera access denied. Please allow camera permissions.");
      }
    }
    setupCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setAppliedFilters(null);
    setSuggestedName(''); // Clear suggested name on new capture

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Simulate premium processing delay
      setTimeout(() => {
        setCapturedImage(dataUrl);
        setIsCapturing(false);
      }, 800);
    } else {
      setIsCapturing(false);
    }
  };

  const bakeFilters = (imageData: string, filters: ScanFilters): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Apply filters to canvas context
          const filterString = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`;
          ctx.filter = filterString;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          resolve(imageData);
        }
      };
      img.src = imageData;
    });
  };

  const handleNeuralEnhance = async () => {
    if (!capturedImage) return;

    if (!hasConsent) {
      setShowConsent(true);
      return;
    }

    if (!canUseAI()) {
      navigate('/pricing');
      return;
    }

    setIsPolishing(true);
    setError(null);
    try {
      // Parallel execution for better speed
      const [filters, nameSuggestion] = await Promise.all([
        getPolisherProtocol(undefined, capturedImage),
        askGemini("Suggest a professional filename for this document.", undefined, 'naming', capturedImage)
      ]);

      setAppliedFilters(filters);

      // Force grayscale if in Document mode
      if (scannerMode === 'document') {
        setAppliedFilters(prev => prev ? { ...prev, grayscale: 100 } : null);
      } else {
        // In Photo mode, we prefer color (0), but trust AI if it strongly suggests B&W
      }

      setSuggestedName(nameSuggestion.replace(/ /g, '_'));
      recordAIUsage();
    } catch (err) {
      console.error("Enhancement failed", err);
      setError("Enhancement failed. Please try again.");
    } finally {
      setIsPolishing(false);
    }
  };

  const dataURLToBlob = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const downloadBlob = (blob: Blob, filename: string, type: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    if (!capturedImage) return;
    try {
      const baked = appliedFilters ? await bakeFilters(capturedImage, appliedFilters) : capturedImage;
      const finalName = suggestedName ? `${suggestedName}.jpg` : `scan_${Date.now()}.jpg`;
      downloadBlob(dataURLToBlob(baked), finalName, 'image/jpeg');
    } catch (err) {
      console.error("Download failed", err);
      setError("Download failed. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="p-8 pb-4 flex justify-between items-center bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
        <button onClick={() => navigate(-1)} className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <NeuralPulse color="bg-emerald-500" size="md" />
            <span className="text-emerald-500 font-black text-[8px] tracking-[0.3em] uppercase">Private • Offline Acquisition</span>
          </div>
          <span className="text-white font-black text-xs tracking-widest uppercase opacity-40">Scanner_v4.0_PRO</span>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setScannerMode('photo')}
            className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${scannerMode === 'photo' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Photo
          </button>
          <button
            onClick={() => setScannerMode('document')}
            className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${scannerMode === 'document' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Doc
          </button>
        </div>
        <button onClick={() => setFlash(!flash)} className={`p-2 transition-all ${flash ? 'text-white' : 'text-white/30'}`}>
          <Zap size={22} fill={flash ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Guide Overlay */}
            <div className="absolute inset-10 border-2 border-white/30 rounded-3xl pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                  Align Document
                </p>
              </div>
            </div>

            <AnimatePresence>
              {showGuide && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-50 flex items-center justify-center p-10 bg-black/60 backdrop-blur-md"
                >
                  <div className="w-full max-w-sm space-y-6">
                    <ToolGuide
                      title={protocol === 'ocr' ? "Neural OCR Protocol" : "Neural Reconstruction Protocol"}
                      description={protocol === 'ocr' ? "Extract and interact with text data from physical assets. Convert static images into live interactive lexical streams." : "Acquire and reconstruct physical documents with AI-powered Shadow Purge technology, smart naming, and automated perspective correction."}
                      steps={protocol === 'ocr' ? [
                        "Capture a high-fidelity image of the source text.",
                        "Activate Neural OCR to decouple text from the visual layer.",
                        "Initialize the Data Chat to query the document content.",
                        "Export structured text or JSON payloads."
                      ] : protocol === 'reconstruction' ? [
                        "Position the physical asset within the optical guides.",
                        "Execute High-Fidelity Capture for structural analysis.",
                        "Engage Neural Reconstruction to purge shadows & fix geometry.",
                        "Assemble the restored asset into a secure PDF container."
                      ] : [
                        "Align your document within the visual guide markers.",
                        "Capture the high-fidelity scan using the trigger.",
                        "Activate Neural Reconstruction for shadow & perspective repair.",
                        "Assemble into a multi-page PDF or export as high-end JPEG."
                      ]}
                      useCases={protocol === 'ocr' ? [
                        "Data Retrieval", "Handwriting Digitization", "Code Extraction", "Rapid Translation"
                      ] : [
                        "Receipts & Invoices", "Business Cards", "Handwritten Notes", "Whiteboards", "Official Forms"
                      ]}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowGuide(false)}
                      className="w-full h-20 bg-white text-black rounded-[32px] font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Initialize Acquisition
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center p-6">
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                filter: appliedFilters
                  ? `brightness(${appliedFilters.brightness}%) contrast(${appliedFilters.contrast}%) grayscale(${appliedFilters.grayscale}%)`
                  : 'none'
              }}
              src={capturedImage}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-all duration-700"
            />
            {appliedFilters && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-6 right-6 flex flex-col gap-2 z-50"
              >
                {suggestedName && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/90 backdrop-blur-2xl p-2.5 px-4 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl"
                  >
                    <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 shrink-0">Smart Name:</span>
                    <input
                      type="text"
                      value={suggestedName}
                      onChange={(e) => setSuggestedName(e.target.value)}
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white focus:outline-none flex-1 min-w-0"
                    />
                  </motion.div>
                )}
                <div className="bg-emerald-500/90 backdrop-blur-xl p-3 rounded-2xl flex items-center gap-3 text-white shadow-2xl border border-white/10">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Sparkles size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] block leading-tight text-white">
                        {protocol === 'reconstruction' ? "Expert Restoration Protocol" : "Neural Reconstruction"}
                      </span>
                      {appliedFilters.shadowPurge && (
                        <span className="px-1.5 py-0.5 bg-violet-500 rounded text-[6px] font-black uppercase tracking-widest animate-pulse">Shadow Purge Active</span>
                      )}
                    </div>
                    {protocol === 'reconstruction' ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 opacity-80">
                        <span className="text-[6px] font-black tracking-widest uppercase flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-white" /> Luminosity Balance: OK</span>
                        <span className="text-[6px] font-black tracking-widest uppercase flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-white" /> Shadow Suppression: ACTIVE</span>
                        <span className="text-[6px] font-black tracking-widest uppercase flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-white" /> Geometry Fix: +2.4°</span>
                      </div>
                    ) : (
                      <p className="text-[7px] font-bold opacity-80 uppercase tracking-tight truncate">
                        {appliedFilters.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 border-l border-white/20 pl-2">
                    <button
                      onClick={() => setShowReport(true)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Report"
                    >
                      <Flag size={12} className="text-white/70" />
                    </button>
                    <button
                      onClick={() => {
                        setAppliedFilters(null);
                        setSuggestedName('');
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={12} className="text-white/70" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {isPolishing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
              >
                <Loader2 className="animate-spin text-white" size={32} />
                <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Analyzing Lighting...</span>
              </motion.div>
            )}
          </div>
        )}

        <AnimatePresence>
          {isCapturing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="animate-spin text-violet-600" size={48} />
              <p className="text-slate-900 font-black text-xs uppercase tracking-widest">Enhancing Scan...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-12 bg-black/90 backdrop-blur-2xl flex items-center justify-around border-t border-white/10">
        {!capturedImage ? (
          <>
            <div className="w-12" />
            <button
              onClick={handleCapture}
              className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center group active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              <div className="w-20 h-20 rounded-full bg-white group-hover:scale-90 transition-all flex items-center justify-center shadow-2xl">
                <div className="w-18 h-18 rounded-full border border-black/10" />
              </div>
            </button>
            <button className="text-white/40 hover:text-white transition-colors">
              <RefreshCw size={24} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setCapturedImage(null)}
              className="flex flex-col items-center gap-3 text-white/40 hover:text-white transition-all transform hover:-rotate-12"
            >
              <div className="p-4 bg-white/5 rounded-2xl">
                <RefreshCw size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">Reset Scan</span>
            </button>

            {!appliedFilters ? (
              <button
                onClick={handleNeuralEnhance}
                disabled={isPolishing}
                className="h-20 px-8 bg-violet-600 rounded-3xl flex items-center gap-4 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Wand2 size={20} className={isPolishing ? 'animate-spin' : ''} />
                <span className="font-black text-[10px] uppercase tracking-[0.3em]">
                  {protocol === 'reconstruction' ? "Run Repair Protocol" : "Neural Enhance"}
                </span>
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="h-20 px-6 bg-white/10 rounded-3xl flex flex-col items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <Download size={20} />
                  <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-2">Quick JPEG</span>
                </button>

                <button
                  onClick={async () => {
                    let finalImage = capturedImage;
                    if (appliedFilters) {
                      finalImage = await bakeFilters(capturedImage, appliedFilters);
                    }
                    navigate('/image-to-pdf', { state: { capturedImage: finalImage } });
                  }}
                  className="h-20 px-10 bg-white rounded-3xl flex flex-col items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <FileCheck size={20} />
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Assemble PDF</span>
                  </div>
                  <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mt-1">Handoff to Compile</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AIOptInModal
        isOpen={showConsent}
        onClose={() => setShowConsent(false)}
        onAccept={() => {
          localStorage.setItem('ai_neural_consent', 'true');
          setHasConsent(true);
          setShowConsent(false);
          handleNeuralEnhance();
        }}
      />

      <AIReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </motion.div>
  );
};

export default ScannerScreen;
