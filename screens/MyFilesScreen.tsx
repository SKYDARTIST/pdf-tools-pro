import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, FileText, Trash2, Database
} from 'lucide-react';
import FileHistoryManager, { FileHistoryEntry } from '../utils/FileHistoryManager';
import { formatRelativeTime, getOperationName, formatFileSize } from '../utils/formatters';

const MyFilesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOperation, setFilterOperation] = useState<string>('all');
    const [history, setHistory] = useState<FileHistoryEntry[]>(FileHistoryManager.getHistory());

    const stats = useMemo(() => FileHistoryManager.getStats(), [history]);

    const filteredHistory = useMemo(() => {
        let filtered = history;
        if (searchQuery) filtered = FileHistoryManager.searchHistory(searchQuery);
        if (filterOperation !== 'all') filtered = filtered.filter(entry => entry.operation === filterOperation);
        return filtered;
    }, [history, searchQuery, filterOperation]);

    const handleDelete = (id: string) => {
        FileHistoryManager.deleteEntry(id);
        setHistory(FileHistoryManager.getHistory());
    };

    const handleClearAll = () => {
        if (window.confirm('Clear all file history? This cannot be undone.')) {
            FileHistoryManager.clearHistory();
            setHistory([]);
        }
    };

    const operations = ['all', 'merge', 'split', 'compress', 'sign', 'watermark', 'image-to-pdf'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-transparent pb-32 pt-32 max-w-2xl mx-auto px-6"
        >
            <div className="space-y-12">
                {/* Header Section */}
                <div className="space-y-3 text-center sm:text-left">
                    <div className="text-technical">Data Repository</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Archives</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">Secure history of processed assets</p>
                </div>

                {/* Storage Stats Grid */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                        { label: 'Total', value: stats.totalFiles },
                        { label: 'Saved', value: formatFileSize(stats.totalSaved) },
                        { label: 'Success', value: stats.successCount }
                    ].map((stat) => (
                        <div key={stat.label} className="monolith-card p-5 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{stat.label}</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Search Interface */}
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="SEARCH ARCHIVE..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[24px] py-5 pl-16 pr-6 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 shadow-sm transition-all"
                    />
                </div>

                {/* Filter Controls */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
                    {operations.map(op => (
                        <motion.button
                            key={op}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFilterOperation(op)}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${filterOperation === op
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl'
                                : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'
                                }`}
                        >
                            {op === 'all' ? 'All' : op}
                        </motion.button>
                    ))}
                </div>

                {/* List Management */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="text-technical">{filteredHistory.length} ENTRIES FOUND</div>
                        {history.length > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                onClick={handleClearAll}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 transition-colors"
                            >
                                PURGE ALL
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
                                        whileHover={{ x: 4 }}
                                        className="monolith-card p-5 flex items-center gap-5 group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white transition-colors duration-300">
                                            <FileText size={20} className="text-gray-900 dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black uppercase tracking-tighter truncate">{entry.fileName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {entry.operation}
                                                </span>
                                                <span className="text-[10px] text-gray-300 dark:text-gray-700">•</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {formatRelativeTime(entry.timestamp)}
                                                </span>
                                            </div>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleDelete(entry.id)}
                                            className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                                        >
                                            <Trash2 size={16} />
                                        </motion.button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="monolith-card p-20 flex flex-col items-center justify-center border-dashed border-2 bg-transparent opacity-30">
                                <Database size={40} className="text-gray-400 mb-6" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Archive matches null</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="pt-12 border-t border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-2 opacity-20 hover:opacity-50 transition-opacity cursor-default"
                >
                    <div className="flex items-center gap-3 text-gray-400">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Encrypted Data Store</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-400">Built By Cryptobulla</span>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default MyFilesScreen;
