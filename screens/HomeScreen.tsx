import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, FolderOpen, Sparkles, LayoutGrid, Zap, Info, Shield, CheckCircle
} from 'lucide-react';
import FileHistoryManager from '../utils/FileHistoryManager';
import UsageStats from '../components/UsageStats.tsx';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  useEffect(() => {
    setRecentFiles(FileHistoryManager.getRecent(5));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 pb-32 pt-32 max-w-2xl mx-auto space-y-16"
    >
      {/* Hero Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="space-y-4 text-center"
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="text-technical tracking-[0.3em]">Anti-Gravity Protocol</div>
          <h2 className="text-6xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">
            Workspace
          </h2>
        </div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
          Ready for document interpretation
        </p>
      </motion.div>

      {/* Hub Core */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <UsageStats />
        </div>

        <div className="space-y-4">
          <div className="text-technical ml-1">Critical Operations</div>

          {/* Anti-Gravity Hero Card */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/ag-workspace')}
            className="monolith-card p-10 cursor-pointer group relative overflow-hidden bg-black text-white dark:bg-white dark:text-black border-none"
          >
            <div className="absolute top-1/2 -translate-y-1/2 -right-10 opacity-10 group-hover:opacity-20 group-hover:-right-5 transition-all duration-700">
              <Sparkles size={160} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-black animate-pulse" />
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Anti-Gravity AI</h3>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60">
                  Deep-layer neural analysis
                </p>
              </div>
              <div className="w-14 h-14 bg-white/10 dark:bg-black/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Sparkles size={24} className="text-white dark:text-black" />
              </div>
            </div>
          </motion.div>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: LayoutGrid, label: 'Standard Tools', path: '/tools', desc: 'Core Assets' },
              { icon: Shield, label: 'Secure Vault', path: '/my-files', desc: 'File History' }
            ].map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.path)}
                className="monolith-card p-6 cursor-pointer flex items-center gap-5"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                  <action.icon size={20} className="text-gray-900 dark:text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black uppercase tracking-tighter">{action.label}</h4>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{action.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="text-technical">Data Archive</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/my-files')}
            className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
          >
            Access History
          </motion.button>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {recentFiles.length > 0 ? (
              recentFiles.slice(0, 3).map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  whileHover={{ x: 4 }}
                  className="monolith-card p-5 flex items-center gap-4 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-gray-900 dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black uppercase tracking-tighter">{file.fileName}</h4>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      {new Date(file.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle size={16} className="text-gray-900 dark:text-white opacity-20" />
                </motion.div>
              ))
            ) : (
              <div className="monolith-card p-16 flex flex-col items-center justify-center border-dashed border-2 opacity-30">
                <FolderOpen size={32} className="text-gray-400 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Memory Empty</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / System Note */}
      <div className="pt-8 border-t border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-2 opacity-20 hover:opacity-50 transition-opacity cursor-default">
        <div className="flex items-center gap-3">
          <Zap size={12} fill="currentColor" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">System OS 2.0.1 // Anti-Gravity Core</span>
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-400">Built By Cryptobulla</span>
      </div>
    </motion.div>
  );
};

export default HomeScreen;
