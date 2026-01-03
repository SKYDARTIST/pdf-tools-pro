import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Combine, Scissors, Lock, PenTool, Image, FileText, Minimize2, Droplet, Zap,
    RotateCw, FileImage, Wrench, Trash2, Hash, Globe, FileSpreadsheet
} from 'lucide-react';

const ToolsScreen: React.FC = () => {
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'security' | 'convert'>('all');

    const tools = [
        { title: 'Scanner', desc: 'Secure document scan', icon: Zap, path: '/scanner', cat: 'popular' },
        { title: 'Image to PDF', desc: 'Convert photos to PDF', icon: Image, path: '/image-to-pdf', cat: 'convert' },
        { title: 'Merge', desc: 'Combine PDFs', icon: Combine, path: '/merge', cat: 'popular' },
        { title: 'Split', desc: 'Extract pages', icon: Scissors, path: '/split', cat: 'popular' },
        { title: 'Protect', desc: 'Add password', icon: Lock, path: '/password', cat: 'security' },
        { title: 'To Text', desc: 'Extract copyable text', icon: FileText, path: '/extract-text', cat: 'convert' },
        { title: 'Compress', desc: 'Reduce data weight', icon: Minimize2, path: '/compress', cat: 'popular' },
        { title: 'Sign', desc: 'Authorize documents', icon: PenTool, path: '/sign', cat: 'security' },

        { title: 'Rotate', desc: 'Fix orientation', icon: RotateCw, path: '/rotate', cat: 'popular' },
        { title: 'Watermark', desc: 'Add brand layer', icon: Droplet, path: '/watermark', cat: 'security' },
        { title: 'Get Images', desc: 'Export PDF visuals', icon: FileImage, path: '/extract-images', cat: 'convert' },
        { title: 'Repair', desc: 'Fix corrupted data', icon: Wrench, path: '/repair', cat: 'popular' },
        { title: 'Remove', desc: 'Delete specific pages', icon: Trash2, path: '/remove-pages', cat: 'popular' },
        { title: 'Numbers', desc: 'Add page identifiers', icon: Hash, path: '/page-numbers', cat: 'popular' },
        { title: 'Web Capture', desc: 'Transcribe URLs', icon: Globe, path: '/web-to-pdf', cat: 'convert' },
        { title: 'Excel Engine', desc: 'Neural Table Extraction', icon: FileSpreadsheet, path: '/extract-text', cat: 'convert' },
        { title: 'Meta Engine', desc: 'Edit document data', icon: FileText, path: '/metadata', cat: 'security' },
    ];

    const filtered = tools.filter(tool => {
        const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || tool.cat === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-32 max-w-2xl mx-auto px-6">
            <div className="space-y-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <div className="text-technical">Protocol Assets</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Tools</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Select operation for data manipulation</p>
                </motion.div>

                {/* Search Interaction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative group"
                >
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
                    <input
                        type="search"
                        placeholder="SEARCH PROTOCOLS..."
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[24px] py-5 pl-16 pr-6 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 shadow-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </motion.div>

                {/* Filter Categories */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6"
                >
                    {['all', 'popular', 'security', 'convert'].map((cat, i) => (
                        <motion.button
                            key={cat}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveCategory(cat as any)}
                            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${activeCategory === cat
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl ring-4 ring-black/5 dark:ring-white/5'
                                : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'
                                }`}
                        >
                            {cat}
                        </motion.button>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeCategory + searchQuery}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 gap-4"
                    >
                        {filtered.map((tool, i) => (
                            <motion.button
                                key={tool.title}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ y: -6, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => navigate(tool.path)}
                                className="monolith-card p-6 flex items-center gap-6 text-left border-none shadow-sm hover:shadow-xl transition-all"
                            >
                                <div className="w-14 h-14 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                                    <tool.icon size={22} className="text-black dark:text-white" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[13px] font-black uppercase tracking-wider text-black dark:text-white mb-0.5">{tool.title}</h3>
                                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] leading-relaxed">{tool.desc}</p>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {filtered.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 monolith-card bg-transparent border-dashed border-2 border-black/10 dark:border-white/10"
                    >
                        <Search size={32} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Zero matches in archive</p>
                    </motion.div>
                )}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="pt-12 border-t border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-2 opacity-20 hover:opacity-50 transition-opacity cursor-default"
                >
                    <div className="flex items-center gap-3">
                        <Zap size={12} fill="currentColor" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Anti-Gravity Asset Library</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-400">Built By Cryptobulla</span>
                </motion.div>
            </div>
        </div>
    );
};

export default ToolsScreen;
