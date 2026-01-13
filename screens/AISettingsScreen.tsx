import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap, Info, ArrowLeft, Twitter, ExternalLink, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AISettingsScreen: React.FC = () => {
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-transparent pb-32 pt-32 max-w-2xl mx-auto px-6"
    >
      <div className="space-y-12">
        {/* Header Section */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="text-technical">App Settings</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Security</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">Manage your privacy and AI assistant settings</p>
        </div>

        {/* AI Assistant Toggle Control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="monolith-card p-10 space-y-10 border-none relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Sparkles size={120} />
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-6">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${isAiEnabled ? 'bg-black dark:bg-white' : 'bg-black/5 dark:bg-white/5'}`}
              >
                <Sparkles size={28} className={isAiEnabled ? 'text-white dark:text-black' : 'text-gray-400'} />
              </motion.div>
              <div className="space-y-1">
                <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">AI Assistant</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Gemini AI Engine Integration</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAiEnabled(!isAiEnabled)}
              className={`relative w-20 h-10 rounded-full transition-all duration-300 shadow-xl ${isAiEnabled ? 'bg-black dark:bg-white' : 'bg-gray-100 dark:bg-white/10'}`}
            >
              <motion.div
                animate={{ x: isAiEnabled ? 44 : 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`absolute top-1 w-8 h-8 rounded-full shadow-lg ${isAiEnabled ? 'bg-white dark:bg-black' : 'bg-white dark:bg-gray-400'}`}
              />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 bg-black/5 dark:bg-white/5 rounded-3xl space-y-4 border border-black/5 dark:border-white/5"
          >
            <div className="flex items-center gap-3 text-gray-900 dark:text-white">
              <Info size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">How it works</span>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-wider">
              The assistant reads your document text directly on your device.
              Information is only sent to our secure AI server when you ask a question.
              Turning this off will disable all AI features like chat and summaries.
            </p>
          </motion.div>
        </motion.div>

        {/* Technical Detail Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Shield, title: "Zero Logging", desc: "No local or remote persistence", delay: 0.3 },
            { icon: Zap, title: "Fast Processing", desc: "Optimized for speed", delay: 0.4 },
          ].map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: item.delay }}
              whileHover={{ y: -4 }}
              className="monolith-card p-8 flex flex-col gap-6"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl">
                <item.icon size={20} />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-black uppercase tracking-tighter text-gray-900 dark:text-white">{item.title}</h5>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>



        {/* Platform Protocol Transparency */}
        <div className="monolith-card p-8 space-y-6 border-dashed border-2 border-black/10 dark:border-white/10 bg-transparent shadow-none">
          <div className="flex items-center gap-3 text-gray-500">
            <Globe size={14} />
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em]">How we handle files</h5>
          </div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 leading-relaxed uppercase tracking-widest">
            Basic tools (Merge, Split, Compress, Sign, etc.) run <span className="text-black dark:text-white underline decoration-black/20 dark:decoration-white/20">100% locally</span> on your phone.
            Your files never leave your device unless you use the AI assistant to summarize or analyze them.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-12 flex flex-col items-center space-y-4 opacity-20 hover:opacity-50 transition-opacity cursor-default"
        >
          <div className="w-8 h-[2px] bg-black/10 dark:bg-white/10 rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 px-8 leading-relaxed uppercase font-black tracking-[0.3em]">
              Anti-Gravity Security System
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AISettingsScreen;
