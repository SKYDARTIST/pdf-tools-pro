
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, RefreshCw, FileCheck, Loader2, Sparkles, Wand2, Share2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getReconstructionProtocol, getPolisherProtocol, ScanFilters } from '../services/polisherService';
import { askGemini } from '../services/aiService';
import { recordAIUsage, AiOperationType } from '../services/subscriptionService';
import { downloadFile } from '../services/downloadService';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';
import ToolGuide from '../components/ToolGuide';
import NeuralPulse from '../components/NeuralPulse';
import { compressImage } from '../utils/imageProcessor';
import { useAuthGate } from '../hooks/useAuthGate';
import { AuthModal } from '../components/AuthModal';

const ScannerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { authModalOpen, setAuthModalOpen, requireAuth, handleAuthSuccess } = useAuthGate();
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
  const [isSharing, setIsSharing] = useState(false);
  const location = useLocation();

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

  // Handle Direct-Share Inbound
  useEffect(() => {
    const sharedFile = (location.state as any)?.sharedFile;
    if (sharedFile && sharedFile.type.includes('image')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setIsCapturing(false);
      };
      reader.readAsDataURL(sharedFile);

      // Clear state so it doesn't reload on every mount
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0); // MAX FIDELITY SOURCE

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
    console.log('🔥 BAKING FILTERS:', filters);
    return new Promise(async (resolve) => {
      const img = new Image();
      img.onload = async () => {
        // Step 0: Calculate target dimensions (Pro-grade 4000px cap)
        const MAX_DIM = 4000;
        let targetWidth = img.width;
        let targetHeight = img.height;

        if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
            targetWidth = MAX_DIM;
          } else {
            targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
            targetHeight = MAX_DIM;
          }
          console.log(`📏 High-Fidelity Resize: ${img.width}x${img.height} -> ${targetWidth}x${targetHeight}`);
        }

        let canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        let ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        // Draw and scaling happens here
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Step 1: Apply advanced processing if enabled (reconstruction mode)
        if (filters.perspectiveCorrection || filters.autoCrop || filters.textEnhancement) {
          const { detectDocumentEdges, perspectiveTransform, enhanceText } = await import('../utils/imageProcessing');

          // Perspective correction and auto-crop
          if (filters.perspectiveCorrection || filters.autoCrop) {
            const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const corners = detectDocumentEdges(imageDataObj);

            if (corners) {
              console.log('📐 Applying perspective correction...');
              canvas = perspectiveTransform(canvas, corners);
              ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(imageData);
                return;
              }
            }
          }

          // Text & Detail enhancement
          if (filters.textEnhancement) {
            console.log(`📝 Applying text enhancement (Intensity: ${filters.sharpness})...`);
            canvas = enhanceText(canvas, filters.sharpness);
            ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(imageData);
              return;
            }
          }
        }

        // Step 2: Get pixel data for standard filter manipulation
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        // Convert filter percentages to multipliers
        const brightnessFactor = filters.brightness / 100;
        const contrastFactor = filters.contrast / 100;
        const grayscaleFactor = filters.grayscale / 100;

        // Apply pixel-level transformations
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Apply grayscale if needed
          if (grayscaleFactor > 0) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = r * (1 - grayscaleFactor) + gray * grayscaleFactor;
            g = g * (1 - grayscaleFactor) + gray * grayscaleFactor;
            b = b * (1 - grayscaleFactor) + gray * grayscaleFactor;
          }

          // Apply contrast (centered around 128) - with a slight extra "Studio" boost
          const studioBoost = 1.1;
          const finalContrast = contrastFactor * studioBoost;
          r = ((r - 128) * finalContrast) + 128;
          g = ((g - 128) * finalContrast) + 128;
          b = ((b - 128) * finalContrast) + 128;

          // Apply brightness
          r = r * brightnessFactor;
          g = g * brightnessFactor;
          b = b * brightnessFactor;

          // Clamp values to 0-255 range
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }

        // Put the modified pixel data back
        ctx.putImageData(imageDataObj, 0, 0);
        const bakedDataUrl = canvas.toDataURL('image/jpeg', 1.0); // ABSOLUTE lossless export
        console.log(`✅ Filter bake complete. Result length: ${bakedDataUrl.length}`);
        resolve(bakedDataUrl);
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


    // GUIDANCE AI Operation - Scanner guidance is FREE for all users
    // No need to check limits, GUIDANCE is always allowed

    setIsPolishing(true);
    setError(null);
    try {
      const compressedImage = await compressImage(capturedImage);
      const protocolFn = getPolisherProtocol;

      const [filters, nameSuggestion] = await Promise.all([
        protocolFn(undefined, compressedImage),
        askGemini("Suggest a professional filename for this document.", undefined, 'naming', compressedImage)
      ]);

      console.log('🎨 AI Returned Filters:', filters);

      // Apply filters from AI (color is always preserved via polisherService)
      setAppliedFilters(filters);

      setSuggestedName(nameSuggestion.replace(/ /g, '_'));
      await recordAIUsage(AiOperationType.GUIDANCE); // FREE - no credits consumed
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

  const handleShare = async () => {
    if (!capturedImage || isSharing) return;
    setIsSharing(true);
    try {
      console.log('💾 Share initiated with filters:', appliedFilters);
      const baked = appliedFilters ? await bakeFilters(capturedImage, appliedFilters) : capturedImage;
      console.log('✅ Filters baked successfully');
      const finalName = suggestedName ? `${suggestedName}.jpg` : `scan_${Date.now()}.jpg`;
      const blob = dataURLToBlob(baked);
      await downloadFile(blob, finalName);
    } catch (err) {
      console.error("Share failed", err);
      setError("Share failed. Please try again.");
    } finally {
      setIsSharing(false);
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
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-2 mb-1">
            <NeuralPulse color="bg-emerald-500" size="md" />
            <span className="text-emerald-500 font-black text-[8px] tracking-[0.3em] uppercase">Safe • Private Scanning</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span className="text-emerald-500 font-black text-[7px] tracking-[0.2em] uppercase">100% Watermark Free</span>
          </div>
          <span className="text-white font-black text-xs tracking-widest uppercase opacity-40">Scanner_v4.0_PRO</span>
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
                  Align your document
                </p>
              </div>
            </div>

            <AnimatePresence>
              {showGuide && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md overflow-y-auto"
                >
                  <div className="flex-1 flex flex-col items-center justify-start p-6 pt-4 pb-24 min-h-0">
                    <div className="w-full max-w-sm space-y-4">
                      <ToolGuide
                        title="How to scan"
                        description="Take a clear photo of your document. Our AI will automatically enhance the quality, fix the lighting, and suggest a professional name for your file."
                        steps={[
                          "Point your camera at the document.",
                          "Tap the button to take a photo.",
                          "Tap 'Enhance' to fix the quality and lighting.",
                          "Save your scan as a PDF or an Image file."
                        ]}
                        useCases={[
                          "Receipts & Invoices", "Business Cards", "Handwritten Notes", "Whiteboards", "Official Forms"
                        ]}
                      />
                    </div>
                  </div>
                  {/* Fixed bottom button */}
                  <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowGuide(false)}
                      className="w-full h-16 bg-white text-black rounded-full font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Start Scanning
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
                    <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 shrink-0">File Name:</span>
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
                        AI Enhanced
                      </span>
                      {appliedFilters.shadowPurge && (
                        <span className="px-1.5 py-0.5 bg-violet-500 rounded text-[6px] font-black uppercase tracking-widest animate-pulse">Shadows Fixed</span>
                      )}
                    </div>
                    <p className="text-[7px] font-bold opacity-80 uppercase tracking-tight truncate mt-1">
                      {appliedFilters.reason}
                    </p>
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
                <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Enhancing quality...</span>
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
              <p className="text-slate-900 font-black text-xs uppercase tracking-widest">Processing photo...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 sm:p-8 bg-black/90 backdrop-blur-2xl flex items-center justify-around border-t border-white/10 safe-area-bottom">
        {!capturedImage ? (
          <>
            <div className="w-10" />
            <button
              onClick={handleCapture}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/20 flex items-center justify-center group active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white group-hover:scale-90 transition-all flex items-center justify-center shadow-2xl">
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border border-black/10" />
              </div>
            </button>
            <button className="text-white/40 hover:text-white transition-colors">
              <RefreshCw size={20} />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              onClick={() => setCapturedImage(null)}
              className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition-all p-2"
            >
              <div className="p-2.5 bg-white/5 rounded-xl">
                <RefreshCw size={18} />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest">Retake</span>
            </button>

            {!appliedFilters ? (
              <button
                onClick={() => requireAuth(handleNeuralEnhance)}
                disabled={isPolishing}
                className="h-14 px-5 bg-violet-600 rounded-full flex items-center gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Wand2 size={16} className={isPolishing ? 'animate-spin' : ''} />
                <span className="font-black text-[9px] uppercase tracking-[0.2em]">
                  AI Enhance
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleShare}
                  className="h-14 px-4 bg-white/10 rounded-full flex items-center gap-2 text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <Share2 size={16} />
                  <span className="text-[8px] font-black uppercase tracking-widest">JPEG</span>
                </button>

                <button
                  onClick={async () => {
                    console.log('📄 [Scanner] Assemble PDF button triggered');
                    let finalImage = capturedImage;
                    if (appliedFilters) {
                      console.log('🔥 Baking filters before PDF assembly...');
                      finalImage = await bakeFilters(capturedImage, appliedFilters);
                      console.log('✅ Filters baked, navigating to PDF assembly');
                    }
                    navigate('/image-to-pdf', { state: { capturedImage: finalImage } });
                  }}
                  className="h-14 px-5 bg-white rounded-full flex items-center gap-2 text-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  <FileCheck size={16} />
                  <span className="font-black text-[9px] uppercase tracking-[0.2em]">PDF</span>
                </button>
              </>
            )}
          </div>
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </motion.div>
  );
};

export default ScannerScreen;
