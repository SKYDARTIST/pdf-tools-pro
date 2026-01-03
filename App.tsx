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
import CompressScreen from './screens/CompressScreen';
import ScannerScreen from './screens/ScannerScreen';
import WebToPdfScreen from './screens/WebToPdfScreen';
import WatermarkScreen from './screens/WatermarkScreen';
import SignScreen from './screens/SignScreen';
import ViewScreen from './screens/ViewScreen';
import RepairScreen from './screens/RepairScreen';
import ExtractTextScreen from './screens/ExtractTextScreen';
import AISettingsScreen from './screens/AISettingsScreen';
import PasswordScreen from './screens/PasswordScreen';
import ReaderScreen from './screens/ReaderScreen';
import RotateScreen from './screens/RotateScreen';
import PageNumbersScreen from './screens/PageNumbersScreen';
import ExtractImagesScreen from './screens/ExtractImagesScreen';
import MetadataScreen from './screens/MetadataScreen';
import ToolsScreen from './screens/ToolsScreen';
import AntiGravityWorkspace from './screens/AntiGravityWorkspace';
import MyFilesScreen from './screens/MyFilesScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SystemBoot from './components/SystemBoot';

const App: React.FC = () => {
  const location = useLocation();
  const [isBooting, setIsBooting] = React.useState(!sessionStorage.getItem('boot_complete'));

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

  return (
    <div className="min-h-screen bg-transparent flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-slate-200 dark:border-[#1a1a1a]">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth bg-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/tools" element={<ToolsScreen />} />
              <Route path="/merge" element={<MergeScreen />} />
              <Route path="/split" element={<SplitScreen />} />
              <Route path="/remove-pages" element={<RemovePagesScreen />} />
              <Route path="/image-to-pdf" element={<ImageToPdfScreen />} />

              <Route path="/text-to-pdf" element={<TextToPdfScreen />} />
              <Route path="/compress" element={<CompressScreen />} />
              <Route path="/scanner" element={<ScannerScreen />} />
              <Route path="/web-to-pdf" element={<WebToPdfScreen />} />
              <Route path="/watermark" element={<WatermarkScreen />} />
              <Route path="/sign" element={<SignScreen />} />
              <Route path="/view" element={<ViewScreen />} />
              <Route path="/repair" element={<RepairScreen />} />
              <Route path="/extract-text" element={<ExtractTextScreen />} />
              <Route path="/password" element={<PasswordScreen />} />
              <Route path="/reader" element={<ReaderScreen />} />
              <Route path="/rotate" element={<RotateScreen />} />
              <Route path="/page-numbers" element={<PageNumbersScreen />} />
              <Route path="/extract-images" element={<ExtractImagesScreen />} />
              <Route path="/metadata" element={<MetadataScreen />} />
              <Route path="/ai-settings" element={<AISettingsScreen />} />
              <Route path="/ag-workspace" element={<AntiGravityWorkspace />} />
              <Route path="/my-files" element={<MyFilesScreen />} />
              <Route path="/pricing" element={<PricingScreen />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
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
    </div>
  );
};

export default App;
