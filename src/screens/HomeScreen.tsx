import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, FolderOpen, Sparkles, LayoutGrid, CheckCircle, HelpCircle, Hammer
} from 'lucide-react';
import FileHistoryManager from '@/utils/FileHistoryManager';
import { canUseTool } from '@/services/subscriptionService';
import UpgradeModal from '@/components/UpgradeModal';

const DEVLOG_URL = import.meta.env.PROD
  ? 'https://pdf-tools-pro-indol.vercel.app/devlog.json'
  : '/devlog.json';
const DEVLOG_CACHE_KEY = 'ag_devlog_cache';
const DEVLOG_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours



const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [devLog, setDevLog] = useState<{ emoji: string; title: string; body: string; date: string } | null>(null);

  useEffect(() => {
    setRecentFiles(FileHistoryManager.getRecent(10));

    const loadDevLog = async () => {
      try {
        const cached = localStorage.getItem(DEVLOG_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < DEVLOG_CACHE_TTL) { setDevLog(data); return; }
        }
        const res = await fetch(DEVLOG_URL);
        if (res.ok) {
          const json = await res.json();
          if (json.latest) {
            setDevLog(json.latest);
            localStorage.setItem(DEVLOG_CACHE_KEY, JSON.stringify({ data: json.latest, ts: Date.now() }));
          }
        }
      } catch { /* non-critical */ }
    };
    loadDevLog();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 pb-32 pt-40 max-w-2xl mx-auto space-y-20"
    >
      {/* Hero Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="space-y-12 text-center"
      >
        <div className="flex flex-col items-center space-y-6">
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="px-4 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500">Security Active</span>
          </motion.div>
          <h2 className="text-6xl font-black tracking-tighter text-[#000000] dark:text-white uppercase leading-none">
            Workspace
          </h2>
        </div>
        <p className="text-[10px] font-bold text-[#4A5568] dark:text-gray-400 uppercase tracking-[0.4em] leading-relaxed">
          Ready to process your documents
        </p>
      </motion.div>

      {/* Hub Core */}
      <div className="space-y-6">
        {devLog && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="monolith-card rounded-[32px] p-5 flex items-start gap-4 border border-emerald-500/15 bg-emerald-500/[0.02]"
          >
            <div className="w-9 h-9 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
              <Hammer size={14} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500">From the Builder</div>
                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(devLog.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{devLog.emoji}</span>
                <h4 className="text-[11px] font-black uppercase tracking-tight text-[#000000] dark:text-white">{devLog.title}</h4>
              </div>
              <p className="text-[10px] font-bold text-[#4A5568] dark:text-gray-400 leading-relaxed line-clamp-2">{devLog.body}</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-gray-500/60 ml-1">Quick Tools</div>

          {/* Anti-Gravity Hero Card - Pro Obsidian Style */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const { allowed } = canUseTool('ai-workspace');
              if (allowed) {
                navigate('/ag-workspace');
              } else {
                setShowUpgrade(true);
              }
            }}
            className="monolith-glass p-10 cursor-pointer group relative overflow-hidden bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] text-white border border-emerald-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-[40px]"
          >
            <div className="absolute top-1/2 -translate-y-1/2 -right-10 opacity-[0.05] group-hover:opacity-10 group-hover:-right-5 transition-all duration-700">
              <Sparkles size={160} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00C896] animate-pulse shadow-[0_0_10px_rgba(0,200,150,0.5)]" />
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Pro & Neural</h3>
                </div>
                <p className="text-[9px] font-mono font-black uppercase tracking-[0.3em] opacity-80 text-emerald-400">
                  AI Workspace
                </p>
              </div>
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                <Sparkles size={24} className="text-[#00C896]" />
              </div>
            </div>
          </motion.div>


          {/* Secondary Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: LayoutGrid, label: 'All Tools', path: '/tools', desc: 'PDF Toolbox' },
              { icon: HelpCircle, label: 'How to Use', path: '/protocol-guide', desc: 'Simple Guide' }
            ].map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.path)}
                className="monolith-card p-6 cursor-pointer flex items-center gap-5 group"
              >
                <div className="w-12 h-12 bg-[#E6FAF5] dark:bg-white/5 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <action.icon size={20} className="text-[#00C896] dark:text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black uppercase tracking-tighter text-[#000000] dark:text-white">{action.label}</h4>
                  <p className="text-[10px] font-bold text-[#718096] dark:text-gray-400 uppercase tracking-widest">{action.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Feed */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="text-[11px] font-mono font-black uppercase tracking-[0.4em] text-[#718096]">Recent Activity</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/my-files')}
            className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
          >
            View All Files
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
                  transition={{ delay: 0.1 }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate('/reader?protocol=read')}
                  className="monolith-card p-5 flex items-center gap-4 cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-gray-900 dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black uppercase tracking-tighter truncate">{file.fileName}</h4>
                    {file.neuralSignature ? (
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight line-clamp-1 mt-1">
                        {file.neuralSignature}
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        {new Date(file.timestamp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {file.neuralSignature && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      <Sparkles size={8} className="text-emerald-500" />
                      <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">AI Summary</span>
                    </div>
                  )}
                  <CheckCircle size={16} className="text-gray-900 dark:text-white opacity-20" />
                </motion.div>
              ))
            ) : (
              <div className="monolith-card p-16 flex flex-col items-center justify-center border-dashed border-2 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-60">
                <FolderOpen size={32} className="text-[#718096] mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#718096]">History Empty</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureName="Pro & Neural Workspace"
      />
    </motion.div>
  );
};


export default HomeScreen;
