import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, FileText, Trash2, Database, ChevronRight, SortDesc, Calendar, ArrowUpDown,
    Sparkles, Shield, Zap, Combine, Scissors, Image as ImageIcon, PenTool, Droplet,
    RotateCw, BookOpen
} from 'lucide-react';
import FileHistoryManager, { FileHistoryEntry } from '@/utils/FileHistoryManager';
import { formatRelativeTime, formatFileSize } from '@/utils/formatters';
import Analytics from '@/services/analyticsService';
import { getSubscription, SubscriptionTier } from '@/services/subscriptionService';

const MyFilesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOperation, setFilterOperation] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
    const [history, setHistory] = useState<FileHistoryEntry[]>([]);
    const subscription = getSubscription();

    useEffect(() => {
        // Track screen view
        Analytics.track('screen_view', { screen: 'my-files' });

        setHistory(FileHistoryManager.getHistory());
    }, []);

    const stats = useMemo(() => FileHistoryManager.getStats(), [history]);

    const filteredHistory = useMemo(() => {
        if (!Array.isArray(history)) return [];
        let filtered = [...history];

        // Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(entry =>
                (entry.fileName || '').toLowerCase().includes(lowerQuery) ||
                (entry.operation || '').toLowerCase().includes(lowerQuery)
            );
        }

        // Filter by Operation
        if (filterOperation !== 'all') {
            filtered = filtered.filter(entry => entry.operation === filterOperation);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortOrder === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
            if (sortOrder === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
            if (sortOrder === 'name') return (a.fileName || '').localeCompare(b.fileName || '');
            if (sortOrder === 'size') {
                const sizeA = a.finalSize || a.originalSize || 0;
                const sizeB = b.finalSize || b.originalSize || 0;
                return sizeB - sizeA;
            }
            return 0;
        });

        return filtered;
    }, [history, searchQuery, filterOperation, sortOrder]);

    const handleDelete = (id: string) => {
        if (window.confirm('Delete this entry?')) {
            FileHistoryManager.deleteEntry(id);
            setHistory(FileHistoryManager.getHistory());
        }
    };

    const handleClearAll = () => {
        if (window.confirm('Clear all history? This cannot be undone.')) {
            FileHistoryManager.clearHistory();
            setHistory([]);
        }
    };

    const operations = ['all', 'merge', 'split', 'sign', 'watermark', 'image-to-pdf'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-transparent pb-32 pt-40 max-w-2xl mx-auto px-6"
        >
            <div className="space-y-16">
                <div className="flex flex-col items-center sm:items-start space-y-2 mb-12">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black uppercase tracking-[0.5em] text-[#718096]">My</span>
                        <div className="w-4 h-px bg-[#E2E8F0]" />
                        <span className="text-[10px] font-mono font-black uppercase tracking-[0.5em] text-[#718096]">Files</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-[#000000] dark:text-white uppercase leading-none">History</h1>
                    <p className="text-[10px] font-bold text-[#4A5568] dark:text-gray-500 uppercase tracking-[0.4em] leading-relaxed">
                        Secure local project vault
                    </p>
                </div>

                {/* Compact Institutional Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total', value: stats.totalFiles, icon: FileText },
                        { label: 'Saved', value: stats.totalSaved > 0 ? formatFileSize(stats.totalSaved) : '0', icon: Database },
                        { label: 'Success', value: stats.successCount, icon: Calendar }
                    ].map((stat) => (
                        <div key={stat.label} className="monolith-card rounded-3xl p-4 flex flex-col items-center gap-2 border border-[#E2E8F0] dark:border-white/5 bg-[#FFFFFF] dark:bg-white/5 shadow-sm hover:shadow-md transition-all">
                            <stat.icon size={12} className="text-[#00C896] mb-1" />
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-black tracking-tighter text-[#000000] dark:text-white leading-none">
                                    {stat.value}
                                </span>
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#718096] mt-1">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pro Upgrade Banner - FREE users only */}
                {subscription.tier === SubscriptionTier.FREE && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                            Analytics.track('button_click', {
                                button: 'upgrade_banner',
                                source: 'my_files_screen'
                            });
                            navigate('/ag-workspace');
                        }}
                        className="monolith-glass p-6 cursor-pointer group relative overflow-hidden bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] text-white border border-emerald-500/20 shadow-2xl rounded-[40px]"
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 -right-6 opacity-[0.05] group-hover:opacity-10 transition-all duration-700">
                            <Sparkles size={100} />
                        </div>
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
                                <h3 className="text-base font-black uppercase tracking-tighter">Unlock 13 Pro Tools</h3>
                            </div>
                            <p className="text-[8px] font-mono font-black uppercase tracking-[0.2em] text-emerald-400 opacity-80">
                                Sign • Watermark • Extract • Redact • Compare + More
                            </p>
                            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
                                    Your Access:
                                </span>
                                <span className="text-sm font-black text-[#00C896]">
                                    5/18 Tools
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Search Interface */}
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#718096] dark:text-gray-400 group-focus-within:text-[#00C896] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="SEARCH YOUR FILES..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#FFFFFF] dark:bg-white/5 border border-[#E2E8F0] dark:border-white/10 rounded-full py-5 pl-16 pr-12 text-sm font-black uppercase tracking-widest text-[#000000] dark:text-white placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#00C896]/30 focus:shadow-[0_0_20px_rgba(0,200,150,0.05)] transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#718096]"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mx-[-24px] px-6">
                        {operations.map(op => (
                            <motion.button
                                key={op}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFilterOperation(op)}
                                className={`px-6 py-3 rounded-full text-[10px] font-mono font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterOperation === op
                                    ? 'bg-[#000000] dark:bg-white text-white dark:text-black border-transparent shadow-xl ring-4 ring-black/5 dark:ring-white/5'
                                    : 'bg-[#FFFFFF] dark:bg-white/5 text-[#718096] border-[#E2E8F0] dark:border-white/10 hover:border-[#00C896]/30 hover:text-[#00C896]'
                                    }`}
                            >
                                {op === 'all' ? 'All' : op}
                            </motion.button>
                        ))}
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar mx-[-24px] px-6 border-b border-[#E2E8F0] dark:border-white/5">
                        {[
                            { id: 'newest', label: 'Recent', icon: Calendar },
                            { id: 'name', label: 'A-Z', icon: ArrowUpDown },
                            { id: 'size', label: 'Size', icon: SortDesc }
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSortOrder(s.id as any)}
                                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-[9px] font-mono font-black uppercase tracking-widest transition-all ${sortOrder === s.id
                                    ? 'text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/20'
                                    : 'text-[#718096] border border-transparent hover:text-[#4A5568]'
                                    }`}
                            >
                                <s.icon size={12} />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#718096]">{filteredHistory.length} PROJECTS INDEXED</div>
                        {history.length > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05, color: '#EF4444' }}
                                onClick={handleClearAll}
                                className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-[#A0AEC0] transition-colors"
                            >
                                DELETE ALL
                            </motion.button>
                        )}
                    </div>

                    <AnimatePresence mode="popLayout">
                        {filteredHistory.length > 0 ? (
                            <div className="space-y-3">
                                {filteredHistory.map((entry, i) => (
                                    <motion.div
                                        key={entry.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.02 }}
                                        whileHover={{ x: 6 }}
                                        onClick={() => {
                                            const pathMap: Record<string, string> = {
                                                'extract-text': '/ag-workspace',
                                                'merge': '/merge',
                                                'split': '/split',
                                                'sign': '/sign',
                                                'watermark': '/watermark',
                                                'image-to-pdf': '/image-to-pdf'
                                            };
                                            navigate(pathMap[entry.operation] || '/tools');
                                        }}
                                        className="monolith-card rounded-[40px] p-6 flex items-center gap-6 group border border-[#E2E8F0] dark:border-white/5 bg-[#FFFFFF] dark:bg-white/5 shadow-sm hover:shadow-xl cursor-pointer"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-[#E6FAF5] dark:bg-white/10 flex items-center justify-center shrink-0 border border-[#00C896]/10 group-hover:scale-110 transition-transform">
                                            <FileText size={24} className="text-[#00C896] dark:text-white" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black uppercase tracking-tighter truncate text-[#000000] dark:text-white">{entry.fileName}</h4>
                                            <div className="flex items-center gap-2.5 mt-2">
                                                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#00C896]">
                                                    {entry.operation}
                                                </span>
                                                <span className="text-[10px] text-[#E2E8F0] dark:text-gray-700">•</span>
                                                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#718096]">
                                                    {formatFileSize(entry.finalSize || entry.originalSize || 0)}
                                                </span>
                                                <span className="text-[10px] text-[#E2E8F0] dark:text-gray-700">•</span>
                                                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#A0AEC0]">
                                                    {formatRelativeTime(entry.timestamp)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 90 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleDelete(entry.id)}
                                                className="w-10 h-10 rounded-full bg-[#F8F8F8] dark:bg-white/5 flex items-center justify-center text-[#A0AEC0] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-all shrink-0 border border-[#E2E8F0] dark:border-white/10"
                                            >
                                                <Trash2 size={16} />
                                            </motion.button>
                                            <ChevronRight size={18} className="text-[#E2E8F0] dark:text-gray-700 group-hover:text-[#00C896] transition-colors" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {/* Empty State Header */}
                                <div className="text-center space-y-3 px-6">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-[#000000] dark:text-white">No Files Yet</h3>
                                    <p className="text-[10px] font-bold text-[#718096] dark:text-gray-500 uppercase tracking-[0.3em]">
                                        Get started with these tools
                                    </p>
                                </div>

                                {/* Quick Start Tiles - FREE Users */}
                                {subscription.tier === SubscriptionTier.FREE && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#00C896]" />
                                            <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#000000] dark:text-white">Free Tools</h4>
                                            <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-white/5" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { icon: Combine, label: 'Merge PDFs', path: '/merge' },
                                                { icon: Scissors, label: 'Split PDF', path: '/split' },
                                                { icon: Zap, label: 'Scan Doc', path: '/scanner' },
                                                { icon: ImageIcon, label: 'Image→PDF', path: '/image-to-pdf' }
                                            ].map((tool, i) => (
                                                <motion.button
                                                    key={tool.label}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    whileHover={{ y: -4, scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => navigate(tool.path)}
                                                    className="p-6 rounded-[32px] border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-white/5 flex flex-col items-center gap-3 hover:border-[#00C896]/30 dark:hover:border-[#00C896]/30 transition-all shadow-sm hover:shadow-md"
                                                >
                                                    <tool.icon size={28} className="text-[#00C896]" />
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-[#000000] dark:text-white">{tool.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quick Start Tiles - PRO Users */}
                                {subscription.tier === SubscriptionTier.LIFETIME && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#000000] dark:text-white">Pro Tools Ready</h4>
                                            <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-white/5" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { icon: PenTool, label: 'Sign', path: '/sign' },
                                                { icon: Droplet, label: 'Watermark', path: '/watermark' },
                                                { icon: RotateCw, label: 'Rotate', path: '/rotate' },
                                                { icon: FileText, label: 'Extract', path: '/extract-text' },
                                                { icon: Trash2, label: 'Remove', path: '/remove-pages' },
                                                { icon: BookOpen, label: 'AI Reader', path: '/reader' }
                                            ].map((tool, i) => (
                                                <motion.button
                                                    key={tool.label}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.08 }}
                                                    whileHover={{ y: -4, scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => navigate(tool.path)}
                                                    className="p-5 rounded-[24px] border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center gap-2 hover:bg-emerald-500/10 transition-all"
                                                >
                                                    <tool.icon size={24} className="text-emerald-500" />
                                                    <span className="text-[8px] font-black uppercase tracking-tight text-[#000000] dark:text-white">{tool.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="pt-12 border-t border-[#E2E8F0] dark:border-white/5 flex flex-col items-center justify-center gap-2 opacity-40 group cursor-default"
                >
                    <div className="flex items-center gap-3 text-[#A0AEC0] group-hover:text-[#718096] transition-colors">
                        <Shield size={12} />
                        <span className="text-[10px] font-mono font-black uppercase tracking-[0.4em]">SECURE LOCAL STORAGE</span>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default MyFilesScreen;
