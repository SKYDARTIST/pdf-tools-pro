import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Zap, Image, Combine, Scissors, FileText, PenTool, RotateCw,
    Droplet, FileImage, Trash2, Hash, Shield, Search, Sparkles, Database,
    GitMerge, EyeOff, Headphones, ArrowLeft, ChevronRight, Info
} from 'lucide-react';
import LegalFooter from '../components/LegalFooter';

const ProtocolGuideScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<'all' | 'ai' | 'core' | 'security'>('all');

    const sections = [
        {
            id: 'ai',
            title: 'AI Tools',
            desc: 'Powerful AI assistants for your documents',
            tools: [
                {
                    title: 'Anti-Gravity Workspace',
                    desc: 'Unlock insights instantly by chatting with your documents. Eliminate manual reading and get answers quickly with our private AI.',
                    icon: Sparkles,
                    path: '/ag-workspace',
                    useCases: ['Contract Analysis', 'Study Summaries', 'Data Querying']
                },
                {
                    title: 'AI Audit',
                    desc: 'Expose hidden risks and financial opportunities buried in fine print. Your automated expert for checking long legal or financial documents.',
                    icon: Shield,
                    path: '/reader?protocol=audit',
                    useCases: ['Risk Assessment', 'Legal Review', 'Cost Auditing']
                },
                {
                    title: 'Data Extractor',
                    desc: 'Turn messy scans and handwriting into sharp, structured data. Smart text recognition that digitalizes your paper trail perfectly.',
                    icon: Database,
                    path: '/data-extractor',
                    useCases: ['Invoice Processing', 'Medical OCR', 'Handwritten Notes']
                },
                {
                    title: 'AI Redact',
                    desc: 'Keep your personal information private. Automatically find and black out sensitive info like names and addresses.',
                    icon: EyeOff,
                    path: '/smart-redact',
                    useCases: ['Compliance', 'Privacy', 'Secure Sharing']
                },
                {
                    title: 'AI Diff',
                    desc: 'Track every revision. Instantly highlight every change between document versions so you never miss a detail.',
                    icon: GitMerge,
                    path: '/neural-diff',
                    useCases: ['Agreement Tracking', 'Audit Trails', 'Revision Sync']
                }
            ]
        },
        {
            id: 'core',
            title: 'Basic Tools',
            desc: 'Essential PDF management',
            tools: [
                {
                    title: 'Merge',
                    desc: 'Combine multiple PDF files into one. Perfect for organizing reports and document bundles.',
                    icon: Combine,
                    path: '/merge',
                    useCases: ['Combining Reports', 'Bundling Files']
                },
                {
                    title: 'Split',
                    desc: 'Break large PDFs into smaller parts. Extract exactly the pages you need.',
                    icon: Scissors,
                    path: '/split',
                    useCases: ['Page Extraction', 'Topic Isolation']
                },
                {
                    title: 'Scanner',
                    desc: 'Convert paper documents into high-quality PDFs. AI enhancement ensures every scan is clear and professional.',
                    icon: Zap,
                    path: '/scanner',
                    useCases: ['Receipt Capture', 'Scanning Documents']
                },
                {
                    title: 'Image to PDF',
                    desc: 'Turn your photos into professional PDF documents while keeping original high quality.',
                    icon: Image,
                    path: '/image-to-pdf',
                    useCases: ['Archiving Photos', 'Visual Documentation']
                },
                {
                    title: 'Rotate',
                    desc: 'Fix sideways or upside-down pages. Ensure your document is perfectly aligned for reading.',
                    icon: RotateCw,
                    path: '/rotate',
                    useCases: ['Correcting Scans', 'Fixing Alignment']
                }
            ]
        },
        {
            id: 'security',
            title: 'Security & Privacy',
            desc: 'Protect your sensitive information',
            tools: [
                {
                    title: 'Sign',
                    desc: 'Sign documents securely with your signature or stamps. Everything stays safe on your device.',
                    icon: PenTool,
                    path: '/sign',
                    useCases: ['Contracts', 'Consent Forms']
                },
                {
                    title: 'Watermark',
                    desc: 'Add custom text or image watermarks to your pages. Protect your documents with your brand or status.',
                    icon: Droplet,
                    path: '/watermark',
                    useCases: ['Branding', 'Document Status', 'Copyright']
                },
                {
                    title: 'PDF Metadata',
                    desc: 'View or edit the hidden details of your PDF like Title and Author. Keep your files professional and organized.',
                    icon: FileText,
                    path: '/metadata',
                    useCases: ['Privacy', 'Clean Exports', 'File Info']
                }
            ]
        }
    ];

    const filteredSections = sections.map(section => ({
        ...section,
        tools: section.tools.filter(tool =>
            (activeSection === 'all' || activeSection === section.id) &&
            (tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.desc.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    })).filter(section => section.tools.length > 0);

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-40 max-w-2xl mx-auto px-6">
            <div className="space-y-16">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-8">
                    <motion.button
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/workspace')}
                        className="w-10 h-10 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-900 dark:text-white border border-black/5 dark:border-white/10"
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                    <div className="space-y-2">
                        <div className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-gray-500">How to use</div>
                        <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Tool Guide</h1>
                    </div>
                </div>

                {/* Search & Tabs */}
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH TOOLS..."
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full py-5 pl-16 pr-6 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-black transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {['all', 'ai', 'core', 'security'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveSection(tab as any)}
                                className={`px-6 py-2.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSection === tab
                                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10'
                                    : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'
                                    }`}
                            >
                                {tab === 'ai' ? 'AI Tools' : tab === 'core' ? 'Basic' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-16">
                    {filteredSections.map((section) => (
                        <div key={section.id} className="space-y-6">
                            <div className="px-2">
                                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white mb-1">
                                    {section.title}
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                    {section.desc}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {section.tools.map((tool, i) => (
                                    <motion.div
                                        key={tool.title}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="monolith-glass rounded-[40px] group p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-none shadow-sm hover:shadow-xl transition-all"
                                    >
                                        <div className="flex items-start gap-5 flex-1">
                                            <div className="w-14 h-14 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all">
                                                <tool.icon size={28} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-none">
                                                    {tool.title}
                                                </h3>
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                                                    {tool.desc}
                                                </p>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {tool.useCases.map(uc => (
                                                        <span key={uc} className="text-[8px] font-mono font-black uppercase tracking-widest px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full text-gray-400">
                                                            {uc}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => navigate(tool.path)}
                                            className="w-full md:w-auto px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[9px] font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-xl"
                                        >
                                            Open Tool
                                            <ChevronRight size={14} />
                                        </motion.button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredSections.length === 0 && (
                    <div className="text-center py-20 opacity-30">
                        <Info size={48} className="mx-auto mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">No tools found</p>
                    </div>
                )}

                <LegalFooter />
            </div>
        </div>
    );
};

export default ProtocolGuideScreen;
