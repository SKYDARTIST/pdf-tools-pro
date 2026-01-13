import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Combine, Scissors, Lock, PenTool, Image, FileText, Droplet, Zap,
    RotateCw, FileImage, Wrench, Trash2, Hash, Globe, FileSpreadsheet, BookOpen, Shield,
    GitMerge, Database, Sparkles
} from 'lucide-react';
import LegalFooter from '../components/LegalFooter';
import TaskCounter from '../components/TaskCounter';

const ToolsScreen: React.FC = () => {
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'security' | 'convert'>('all');

    const tools = [
        { title: 'Read', desc: 'Private PDF Reader', icon: BookOpen, path: '/reader?protocol=read', cat: 'popular' },
        { title: 'Scanner', desc: 'AI Document Scanner', icon: Zap, path: '/scanner', cat: 'popular' },
        { title: 'Image to PDF', desc: 'Convert Photos to PDF', icon: Image, path: '/image-to-pdf', cat: 'convert' },
        { title: 'Merge', desc: 'Merge PDF Files', icon: Combine, path: '/merge', cat: 'popular' },
        { title: 'Split', desc: 'Split & Extract Pages', icon: Scissors, path: '/split', cat: 'popular' },
        { title: 'To Text', desc: 'Extract PDF Text', icon: FileText, path: '/extract-text', cat: 'convert' },
        { title: 'Sign', desc: 'Sign PDF Documents', icon: PenTool, path: '/sign', cat: 'security' },
        { title: 'Rotate', desc: 'Rotate PDF Pages', icon: RotateCw, path: '/rotate', cat: 'popular' },
        { title: 'Watermark', desc: 'Add PDF Watermark', icon: Droplet, path: '/watermark', cat: 'security' },
        { title: 'Get Images', desc: 'Extract PDF Images', icon: FileImage, path: '/extract-images', cat: 'convert' },
        { title: 'Remove', desc: 'Delete PDF Pages', icon: Trash2, path: '/remove-pages', cat: 'popular' },
        { title: 'Numbers', desc: 'Add Page Numbers', icon: Hash, path: '/page-numbers', cat: 'popular' },
        { title: 'PDF Metadata', desc: 'Edit Document Info', icon: FileText, path: '/metadata', cat: 'security' },
    ];

    const filtered = tools.filter(tool => {
        const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || tool.cat === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-40 max-w-md mx-auto px-6">
            <div className="space-y-16">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-gray-500">Available Tools</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Tools</h1>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Select a tool to process your PDFs</p>
                </motion.div>

                <TaskCounter variant="inline" />

                {/* Search Interaction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative group"
                >
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
                    <input
                        type="search"
                        placeholder="Search tools..."
                        aria-label="Search tools"
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full py-5 pl-16 pr-6 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-black transition-all shadow-sm"
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
                            className={`px-6 py-3 rounded-full text-[9px] font-mono font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${activeCategory === cat
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl ring-4 ring-black/5 dark:ring-white/5'
                                : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'
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
                        className="grid grid-cols-2 gap-4"
                    >
                        {filtered.map((tool, i) => (
                            <motion.div
                                key={tool.title}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(tool.path)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(tool.path)}
                                className="monolith-glass rounded-[40px] cursor-pointer p-4 flex flex-col items-center text-center gap-2 border-none shadow-sm hover:shadow-md transition-all group dark:border dark:border-white/5 active:shadow-inner relative"
                            >
                                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center shrink-0 shadow-inner group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all">
                                    <tool.icon size={18} className="transition-colors" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0 px-1">
                                    <h3 className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white mb-0.5 mt-1 leading-none">{tool.title}</h3>
                                    <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight leading-tight line-clamp-2 max-w-[100px]">{tool.desc}</p>
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
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-20"
                                    title="Neural Guidance"
                                >
                                    <Sparkles size={10} />
                                </motion.button>
                            </motion.div>
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No tools found</p>
                    </motion.div>
                )}
                <LegalFooter />
            </div>
        </div>
    );
};

export default ToolsScreen;
