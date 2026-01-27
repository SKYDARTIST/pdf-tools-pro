import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Combine, Scissors, Lock, PenTool, Image, FileText, Droplet, Zap,
    RotateCw, FileImage, Wrench, Trash2, Hash, Globe, FileSpreadsheet, BookOpen, Shield,
    GitMerge, Database, Sparkles
} from 'lucide-react';

import TaskCounter from '../components/TaskCounter';

import { useAuthGate } from '../hooks/useAuthGate';
import { AuthModal } from '../components/AuthModal';

const ToolsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { authModalOpen, setAuthModalOpen, requireAuth, handleAuthSuccess } = useAuthGate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'security' | 'convert'>('all');

    const toolCategories = [
        { id: 'popular', label: 'MOST POPULAR' },
        { id: 'convert', label: 'CONVERSION TOOLS' },
        { id: 'security', label: 'SECURITY & PRIVACY' }
    ];

    const tools = [
        { title: 'Scanner', desc: 'AI Document Scanner', icon: Zap, path: '/scanner', cat: 'popular', isPro: true },

        { title: 'Read', desc: 'Secure PDF Reader', icon: BookOpen, path: '/reader?protocol=read', cat: 'popular' },
        { title: 'Merge', desc: 'Merge PDF Documents', icon: Combine, path: '/merge', cat: 'popular' },
        { title: 'Compare', desc: 'Compare PDF Versions', icon: GitMerge, path: '/neural-diff', cat: 'popular' },
        { title: 'Split', desc: 'Split PDF Pages', icon: Scissors, path: '/split', cat: 'popular' },
        { title: 'Sign', desc: 'Sign PDF High-Security', icon: PenTool, path: '/sign', cat: 'security', isPro: true },
        { title: 'Image to PDF', desc: 'Convert Photos to PDF', icon: Image, path: '/image-to-pdf', cat: 'convert' },
        { title: 'To Text', desc: 'Extract PDF Text layer', icon: FileText, path: '/extract-text', cat: 'convert' },
        { title: 'Rotate', desc: 'Rotate PDF Pages', icon: RotateCw, path: '/rotate', cat: 'popular' },
        { title: 'Watermark', desc: 'Add Secure Watermark', icon: Droplet, path: '/watermark', cat: 'security' },
        { title: 'Get Images', desc: 'Extract PDF Images', icon: FileImage, path: '/extract-images', cat: 'convert' },
        { title: 'Remove', desc: 'Delete PDF Pages', icon: Trash2, path: '/remove-pages', cat: 'popular' },
        { title: 'Numbers', desc: 'Add Page Numbers', icon: Hash, path: '/page-numbers', cat: 'popular' },
    ];

    const filtered = tools.filter(tool => {
        const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || tool.cat === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const renderGrid = (items: typeof tools) => (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12">
            {items.map((tool, i) => (
                <motion.div
                    key={tool.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(tool.path)}
                    className="monolith-card rounded-[40px] cursor-pointer p-6 flex flex-col items-center text-center gap-3 border border-[#E2E8F0] dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-[#00C896]/30 transition-all group relative overflow-hidden"
                >
                    {/* Neural Decoration */}
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#00C896]/5 rounded-full blur-2xl group-hover:bg-[#00C896]/10 transition-colors" />

                    <div className="w-14 h-14 bg-[#E6FAF5] dark:bg-white/5 rounded-full flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                        <tool.icon size={20} className="text-[#00C896] dark:text-white" strokeWidth={2.5} />
                    </div>

                    <div className="min-w-0 px-1">
                        <div className="flex flex-col items-center gap-2 mb-1.5">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-[#000000] dark:text-white leading-none">{tool.title}</h3>
                            {tool.isPro && (
                                <motion.span
                                    initial={{ opacity: 0.8 }}
                                    animate={{ opacity: [0.8, 1, 0.8] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-[6px] font-mono font-black bg-[#E6FAF5] text-[#00C896] px-2 py-0.5 rounded-full uppercase tracking-widest border border-[#00C896]/20 shadow-[0_0_10px_rgba(0,200,150,0.1)]"
                                >
                                    ELITE
                                </motion.span>
                            )}
                        </div>
                        <p className="text-[9px] font-bold text-[#4A5568] dark:text-gray-400 uppercase tracking-tight leading-relaxed line-clamp-2 max-w-[120px]">{tool.desc}</p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.2, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('neural-assistant-sync', {
                                detail: {
                                    query: `Tell me about the ${tool.title} tool. What are its use cases and how do I use it?`,
                                    guidance: true
                                }
                            }));
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#00C896]/10 text-[#00C896] hover:bg-[#00C896] hover:text-white transition-all opacity-40 group-hover:opacity-100 z-20"
                    >
                        <Sparkles size={8} />
                    </motion.button>
                </motion.div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-40 max-w-md mx-auto px-6">
            <div className="space-y-16">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="text-[11px] font-mono font-black uppercase tracking-[0.4em] text-[#718096]">Document Engine</div>
                    <h1 className="text-5xl font-black tracking-tighter text-[#000000] dark:text-white uppercase leading-none">Tools</h1>
                    <p className="text-[10px] font-bold text-[#4A5568] dark:text-gray-400 uppercase tracking-[0.4em]">Select an optimized tool for your workflow</p>
                </motion.div>

                <TaskCounter variant="inline" />

                {/* Search Interaction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative group"
                >
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#718096] dark:text-gray-400 group-focus-within:text-[#00C896] transition-colors" size={20} />
                    <input
                        type="search"
                        placeholder="Search for a tool..."
                        className="w-full bg-[#FFFFFF] dark:bg-white/5 border border-[#E2E8F0] dark:border-white/5 rounded-full py-5 pl-16 pr-6 text-sm font-black uppercase tracking-widest text-[#000000] dark:text-white focus:outline-none focus:border-[#00C896]/30 focus:shadow-[0_0_20px_rgba(0,200,150,0.05)] transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </motion.div>

                {/* Filter Categories */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6"
                >
                    {['all', 'popular', 'security', 'convert'].map((cat) => (
                        <motion.button
                            key={cat}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveCategory(cat as any)}
                            className={`px-6 py-3 rounded-full text-[9px] font-mono font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border ${activeCategory === cat
                                ? 'bg-[#000000] dark:bg-white text-white dark:text-black shadow-2xl ring-4 ring-black/5 dark:ring-white/5 border-transparent'
                                : 'bg-[#FFFFFF] dark:bg-white/5 text-[#718096] border-[#E2E8F0] dark:border-white/10 hover:border-[#00C896]/30 hover:text-[#00C896]'
                                }`}
                        >
                            {cat === 'all' ? 'All' : cat}
                        </motion.button>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeCategory + searchQuery}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-16"
                    >
                        {activeCategory === 'all' && !searchQuery ? (
                            toolCategories.map((meta) => {
                                const toolsInCat = tools.filter(t => t.cat === meta.id);
                                if (toolsInCat.length === 0) return null;
                                return (
                                    <div key={meta.id} className="space-y-10">
                                        <div className="flex items-center gap-4 ml-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] shadow-[0_0_10px_rgba(0,200,150,0.5)]" />
                                            <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#000000] dark:text-gray-100">{meta.label}</h2>
                                            <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-white/5" />
                                        </div>
                                        {renderGrid(toolsInCat)}
                                    </div>
                                );
                            })
                        ) : (
                            renderGrid(filtered)
                        )}
                    </motion.div>
                </AnimatePresence>

                {filtered.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 monolith-card bg-transparent border-dashed border-2 border-black/10 dark:border-white/10"
                    >
                        <Search size={32} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No tools found</p>
                    </motion.div>
                )}

            </div>
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onSuccess={handleAuthSuccess}
            />
        </div>
    );
};

export default ToolsScreen;
