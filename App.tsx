import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Critical screens - loaded immediately
import LandingPage from './screens/LandingPage';
import HomeScreen from './screens/HomeScreen';

// Lazy loaded tool screens
const MergeScreen = lazy(() => import('./screens/MergeScreen'));
const SplitScreen = lazy(() => import('./screens/SplitScreen'));
const RemovePagesScreen = lazy(() => import('./screens/RemovePagesScreen'));
const ImageToPdfScreen = lazy(() => import('./screens/ImageToPdfScreen'));
const PricingScreen = lazy(() => import('./screens/PricingScreen'));
const TextToPdfScreen = lazy(() => import('./screens/TextToPdfScreen'));
const ScannerScreen = lazy(() => import('./screens/ScannerScreen'));
const WatermarkScreen = lazy(() => import('./screens/WatermarkScreen'));
const SignScreen = lazy(() => import('./screens/SignScreen'));
const ViewScreen = lazy(() => import('./screens/ViewScreen'));
const ExtractTextScreen = lazy(() => import('./screens/ExtractTextScreen'));
const AISettingsScreen = lazy(() => import('./screens/AISettingsScreen'));
const ReaderScreen = lazy(() => import('./screens/ReaderScreen'));
const RotateScreen = lazy(() => import('./screens/RotateScreen'));
const PageNumbersScreen = lazy(() => import('./screens/PageNumbersScreen'));
const ExtractImagesScreen = lazy(() => import('./screens/ExtractImagesScreen'));
const ToolsScreen = lazy(() => import('./screens/ToolsScreen'));
const AntiGravityWorkspace = lazy(() => import('./screens/AntiGravityWorkspace'));
const TableExtractorScreen = lazy(() => import('./screens/TableExtractorScreen'));
const MyFilesScreen = lazy(() => import('./screens/MyFilesScreen'));
const SmartRedactScreen = lazy(() => import('./screens/SmartRedactScreen'));
const PrivacyManifestoScreen = lazy(() => import('./screens/PrivacyManifestoScreen'));
const LegalScreen = lazy(() => import('./screens/LegalScreen'));
const NeuralDiffScreen = lazy(() => import('./screens/NeuralDiffScreen'));
const DataExtractorScreen = lazy(() => import('./screens/DataExtractorScreen'));
const ProtocolGuideScreen = lazy(() => import('./screens/ProtocolGuideScreen'));
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SystemBoot from './components/SystemBoot';
import AiPackNotification from './components/AiPackNotification';
import NeuralAssistant from './components/NeuralAssistant';
import PullToRefresh from './components/PullToRefresh';
import { getAiPackNotification, ackAiNotification, initSubscription } from './services/subscriptionService';
import { initServerTime } from './services/serverTimeService';
import BillingService from './services/billingService';
import { initializePersistentLogging } from './services/persistentLogService';
import DebugLogPanel from './components/DebugLogPanel';
import { Filesystem } from '@capacitor/filesystem';
import { useNavigate } from 'react-router-dom';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isBooting, setIsBooting] = React.useState(!sessionStorage.getItem('boot_complete'));
  const [activeNotification, setActiveNotification] = React.useState<{ message: string; type: 'milestone' | 'warning' | 'exhausted' } | null>(null);
  const [debugPanelOpen, setDebugPanelOpen] = React.useState(false);

  const [isDataReady, setIsDataReady] = React.useState(false);
  const [bootAnimFinished, setBootAnimFinished] = React.useState(false);

  // Sync with Supabase and fetch server time on mount
  React.useEffect(() => {
    const init = async () => {
      try {
        initializePersistentLogging(); // Start capturing logs to localStorage
        initServerTime();  // Fetch server time immediately (non-blocking)

        // NON-BLOCKING: Start subscription fetch in background
        // Allow app to launch immediately with cached credentials
        initSubscription().catch(e => console.warn('Background subscription sync failed:', e));
        console.log('🚀 App: Critical initialization complete');
      } catch (e) {
        console.error('🚀 App: Initialization error:', e);
      } finally {
        setIsDataReady(true);
      }
    };

    init();
  }, []);

  // Coordinated Boot Sequence: Wait for BOTH Data + Animation
  React.useEffect(() => {
    if (isDataReady && (bootAnimFinished || !isBooting)) {
      // Only run this logic once when everything is ready
      if (isBooting) {
        setIsBooting(false);
        sessionStorage.setItem('boot_complete', 'true');

        // Trigger post-boot actions
        console.log('🚀 App: Boot sequence finished - triggering purchase restore...');
        BillingService.syncPurchasesWithState().catch(error => {
          console.error('🚀 App: Deferred purchase restore error:', error);
        });
      }
    }
  }, [isDataReady, bootAnimFinished, isBooting]);

  // Global AI Notification Listener
  React.useEffect(() => {
    if (!isDataReady) return; // Don't check notifications until data is ready

    // Check on mount and on location change
    const checkNotification = () => {
      const notification = getAiPackNotification();
      if (notification) {
        setActiveNotification(notification);
      }
    };

    checkNotification();

    // Also poll occasionally or listen for storage events if needed
    const interval = setInterval(checkNotification, 2000);
    return () => clearInterval(interval);
  }, [location.pathname, isDataReady]);

  React.useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      document.documentElement.style.setProperty('--mouse-x', `${x}px`);
      document.documentElement.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleMove);
    window.addEventListener('touchmove', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  // Triple-tap to open debug logs
  const tapCountRef = React.useRef(0);
  React.useEffect(() => {
    let tapTimeout: NodeJS.Timeout;

    const handleTap = () => {
      tapCountRef.current += 1;
      clearTimeout(tapTimeout);

      if (tapCountRef.current === 3) {
        setDebugPanelOpen(true);
        tapCountRef.current = 0;
      }

      tapTimeout = setTimeout(() => {
        tapCountRef.current = 0;
      }, 500);
    };

    window.addEventListener('click', handleTap);
    return () => {
      window.removeEventListener('click', handleTap);
      clearTimeout(tapTimeout);
    };
  }, []);

  // Neural Direct-Share Listener
  React.useEffect(() => {
    const handleSharedFile = async (e: any) => {
      const { path, type } = e.detail;
      try {
        const fileData = await Filesystem.readFile({
          path: path
        });

        // Convert to Blob/File for compatibility with existing tools
        const blob = await (await fetch(`data:${type};base64,${fileData.data}`)).blob();
        const file = new File([blob], path.split('/').pop() || 'shared_asset', { type });

        if (type.includes('pdf')) {
          navigate('/reader', { state: { sharedFile: file } });
        } else if (type.includes('image')) {
          navigate('/scanner', { state: { sharedFile: file } });
        }
      } catch (err) {
        console.error('Neural Share Error:', err);
      }
    };

    window.addEventListener('neuralSharedFile', handleSharedFile);
    return () => window.removeEventListener('neuralSharedFile', handleSharedFile);
  }, [navigate]);

  const handleGlobalRefresh = async () => {
    // Artificial delay for neural synchronization feel
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload();
  };

  const isLandingPage = location.pathname === '/';

  // SAFETY: If data is not ready and not booting (e.g. refresh), show empty or loader
  // This prevents the "flash of free tier" on refresh
  if (!isDataReady && !isBooting) {
    return <div className="min-h-screen bg-black" />; // Or a spinner
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      {!isLandingPage && <Header />}
      <main className={`flex-1 ${isLandingPage ? '' : 'overflow-y-auto pb-20'} scroll-smooth bg-transparent`}>
        <PullToRefresh onRefresh={handleGlobalRefresh}>
          <AnimatePresence>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1, ease: "linear" }}
            >
              <Suspense fallback={null}>
                <Routes location={location}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/workspace" element={<HomeScreen />} />
                  <Route path="/tools" element={<ToolsScreen />} />
                  <Route path="/merge" element={<MergeScreen />} />
                  <Route path="/split" element={<SplitScreen />} />
                  <Route path="/remove-pages" element={<RemovePagesScreen />} />
                  <Route path="/image-to-pdf" element={<ImageToPdfScreen />} />

                  <Route path="/text-to-pdf" element={<TextToPdfScreen />} />
                  <Route path="/scanner" element={<ScannerScreen />} />
                  <Route path="/watermark" element={<WatermarkScreen />} />
                  <Route path="/sign" element={<SignScreen />} />
                  <Route path="/view" element={<ViewScreen />} />
                  <Route path="/extract-text" element={<ExtractTextScreen />} />
                  <Route path="/reader" element={<ReaderScreen />} />
                  <Route path="/rotate" element={<RotateScreen />} />
                  <Route path="/page-numbers" element={<PageNumbersScreen />} />
                  <Route path="/extract-images" element={<ExtractImagesScreen />} />

                  <Route path="/ai-settings" element={<AISettingsScreen />} />
                  <Route path="/ag-workspace" element={<AntiGravityWorkspace />} />
                  <Route path="/table-extractor" element={<TableExtractorScreen />} />
                  <Route path="/my-files" element={<MyFilesScreen />} />
                  <Route path="/smart-redact" element={<SmartRedactScreen />} />
                  <Route path="/manifesto" element={<PrivacyManifestoScreen />} />
                  <Route path="/neural-diff" element={<NeuralDiffScreen />} />
                  <Route path="/data-extractor" element={<DataExtractorScreen />} />
                  <Route path="/pricing" element={<PricingScreen />} />
                  <Route path="/legal/:type" element={<LegalScreen />} />
                  <Route path="/protocol-guide" element={<ProtocolGuideScreen />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>
      {!isLandingPage && <BottomNav />}
      <AnimatePresence>
        {isBooting && (
          <SystemBoot
            onComplete={() => {
              // Mark animation as done, but let the useEffect above handle the actual dismissal
              // based on isDataReady
              setBootAnimFinished(true);
            }}
          />
        )}
      </AnimatePresence>

      <AiPackNotification
        message={activeNotification?.message || null}
        type={activeNotification?.type || null}
        onClose={() => {
          ackAiNotification();
          setActiveNotification(null);
        }}
      />
      {!isLandingPage && <NeuralAssistant />}
      <DebugLogPanel isOpen={debugPanelOpen} onClose={() => setDebugPanelOpen(false)} />
    </div>
  );
};

export default App;
