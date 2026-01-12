import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HomeScreen from './screens/HomeScreen';
import MergeScreen from './screens/MergeScreen';
import SplitScreen from './screens/SplitScreen';
import RemovePagesScreen from './screens/RemovePagesScreen';
import ImageToPdfScreen from './screens/ImageToPdfScreen';
import PricingScreen from './screens/PricingScreen';
import TextToPdfScreen from './screens/TextToPdfScreen';
import ScannerScreen from './screens/ScannerScreen';
import WatermarkScreen from './screens/WatermarkScreen';
import SignScreen from './screens/SignScreen';
import ViewScreen from './screens/ViewScreen';
import ExtractTextScreen from './screens/ExtractTextScreen';
import AISettingsScreen from './screens/AISettingsScreen';
import ReaderScreen from './screens/ReaderScreen';
import RotateScreen from './screens/RotateScreen';
import PageNumbersScreen from './screens/PageNumbersScreen';
import ExtractImagesScreen from './screens/ExtractImagesScreen';
import MetadataScreen from './screens/MetadataScreen';
import ToolsScreen from './screens/ToolsScreen';
import AntiGravityWorkspace from './screens/AntiGravityWorkspace';
import TableExtractorScreen from './screens/TableExtractorScreen';
import MyFilesScreen from './screens/MyFilesScreen';
import SmartRedactScreen from './screens/SmartRedactScreen';
import PrivacyManifestoScreen from './screens/PrivacyManifestoScreen';
import LandingPage from './screens/LandingPage';
import LegalScreen from './screens/LegalScreen';
import NeuralDiffScreen from './screens/NeuralDiffScreen';
import DataExtractorScreen from './screens/DataExtractorScreen';
import ProtocolGuideScreen from './screens/ProtocolGuideScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SystemBoot from './components/SystemBoot';
import AiPackNotification from './components/AiPackNotification';
import NeuralAssistant from './components/NeuralAssistant';
import PullToRefresh from './components/PullToRefresh';
import { getAiPackNotification, ackAiNotification, initSubscription } from './services/subscriptionService';
import { initServerTime } from './services/serverTimeService';
import { Filesystem } from '@capacitor/filesystem';
import { useNavigate } from 'react-router-dom';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isBooting, setIsBooting] = React.useState(!sessionStorage.getItem('boot_complete'));
  const [activeNotification, setActiveNotification] = React.useState<{ message: string; type: 'milestone' | 'warning' | 'exhausted' } | null>(null);

  // Sync with Supabase and fetch server time on mount
  React.useEffect(() => {
    initSubscription();
    initServerTime();  // Fetch server time to prevent clock manipulation
  }, []);

  // Global AI Notification Listener
  React.useEffect(() => {
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
  }, [location.pathname]);

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
                <Route path="/metadata" element={<MetadataScreen />} />
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
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>
      {!isLandingPage && <BottomNav />}
      <AnimatePresence>
        {isBooting && (
          <SystemBoot
            onComplete={() => {
              setIsBooting(false);
              sessionStorage.setItem('boot_complete', 'true');
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
    </div>
  );
};

export default App;
