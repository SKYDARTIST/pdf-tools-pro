import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Combine, Scissors, Lock, PenTool, Image, FileText, Droplet, Zap,
    RotateCw, FileImage, Wrench, Trash2, Hash, Globe, FileSpreadsheet, BookOpen, Shield,
    GitMerge, Database, Sparkles
} from 'lucide-react';
import LegalFooter from '../components/LegalFooter';

const ToolsScreen: React.FC = () => {
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'security' | 'convert'>('all');

    const tools = [
        { title: 'Read', desc: 'Secure Sequential Reading', icon: BookOpen, path: '/reader', cat: 'popular' },
        { title: 'Scanner', desc: 'AI Polish & Smart Naming', icon: Zap, path: '/scanner', cat: 'popular' },
        { title: 'Image to PDF', desc: 'Convert photos to PDF', icon: Image, path: '/image-to-pdf', cat: 'convert' },
        { title: 'Merge', desc: 'Combine PDFs', icon: Combine, path: '/merge', cat: 'popular' },
        { title: 'Split', desc: 'Extract pages', icon: Scissors, path: '/split', cat: 'popular' },
        { title: 'To Text', desc: 'Extract copyable text', icon: FileText, path: '/extract-text', cat: 'convert' },
        { title: 'Sign', desc: 'Authorize documents', icon: PenTool, path: '/sign', cat: 'security' },
        { title: 'Rotate', desc: 'Fix orientation', icon: RotateCw, path: '/rotate', cat: 'popular' },
        { title: 'Watermark', desc: 'Add brand layer', icon: Droplet, path: '/watermark', cat: 'security' },
        { title: 'Get Images', desc: 'Export PDF visuals', icon: FileImage, path: '/extract-images', cat: 'convert' },
        { title: 'Repair', desc: 'Fix corrupted data', icon: Wrench, path: '/repair', cat: 'popular' },
        { title: 'Remove', desc: 'Delete specific pages', icon: Trash2, path: '/remove-pages', cat: 'popular' },
        { title: 'Numbers', desc: 'Add page identifiers', icon: Hash, path: '/page-numbers', cat: 'popular' },
        { title: 'Table AI', desc: 'Neural Table Extraction', icon: FileSpreadsheet, path: '/table-extractor', cat: 'convert' },
        { title: 'Smart Redact', desc: 'Auto-PII Neutralization', icon: Shield, path: '/smart-redact', cat: 'security' },
        { title: 'Neural OCR', desc: 'Interactive Data Chat', icon: Zap, path: '/scanner', cat: 'convert' },
        { title: 'Neural Diff', desc: 'Compare document versions', icon: GitMerge, path: '/neural-diff', cat: 'security' },
        { title: 'Expansion Studio', desc: 'Educational Expansion (Bonus)', icon: Sparkles, path: '/reader', cat: 'popular' },
        { title: 'Data Extractor', desc: 'PDF to JSON/CSV feed', icon: Database, path: '/data-extractor', cat: 'convert' },
        { title: 'Meta Engine', desc: 'Edit document data', icon: FileText, path: '/metadata', cat: 'security' },
    ];

    const filtered = tools.filter(tool => {
        const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || tool.cat === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-24 max-w-5xl mx-auto px-6">
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
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                        {filtered.map((tool, i) => (
                            <button
                                key={tool.title}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                whileHover={{ y: -6, scale: 1.02, backgroundColor: 'rgba(0,0,0,0.02)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(tool.path)}
                                className="monolith-card p-4 sm:p-5 flex flex-col items-center text-center gap-3 border-none shadow-sm hover:shadow-md transition-all group dark:border dark:border-white/5 active:shadow-inner"
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all">
                                    <tool.icon size={20} className="transition-colors" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-black dark:text-white mb-0.5 mt-1">{tool.title}</h3>
                                    <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight leading-tight line-clamp-2 max-w-[120px]">{tool.desc}</p>
                                </div>
                            </button>
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
                <LegalFooter />
            </div>
        </div>
    );
};

export default ToolsScreen;
