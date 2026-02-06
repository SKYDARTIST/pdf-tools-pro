import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Zap, Image, Combine, Scissors, FileText, PenTool, RotateCw,
    Droplet, FileImage, Trash2, Hash, Shield, Sparkles, Database,
    GitMerge, EyeOff, Headphones, ArrowLeft, ChevronRight, Info
} from 'lucide-react';
import NeuralPulse from '@/components/NeuralPulse';


interface ToolDefinition {
    title: string;
    desc: string;
    icon: any;
    path: string;
    useCases: string[];
    isElite?: boolean;
    isPopular?: boolean;
}

interface SectionDefinition {
    id: string;
    title: string;
    desc: string;
    tools: ToolDefinition[];
}

const ProtocolGuideScreen: React.FC = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<'all' | 'ai' | 'core' | 'security'>('all');

    const sections: SectionDefinition[] = [
        {
            id: 'ai',
            title: 'AI Tools',
            desc: 'Powerful Neural tools for your documents',
            tools: [
                {
                    title: 'Anti-Gravity Workspace',
                    desc: 'Chat with your documents for instant answers.',
                    icon: Sparkles,
                    path: '/ag-workspace',
                    useCases: ['Contract Analysis', 'Study Summaries', 'Data Querying'],
                    isElite: true
                },
                {
                    title: 'Smart Reader',
                    desc: 'Immersive reading environment with AI smart-scrolling.',
                    icon: BookOpen,
                    path: '/reader?protocol=read',
                    useCases: ['Academic Research', 'Technical Analysis', 'Mobile Reading'],
                    isElite: true
                },
                {
                    title: 'Data Extractor',
                    desc: 'Turn messy scans and handwriting into sharp data.',
                    icon: Database,
                    path: '/data-extractor',
                    useCases: ['Invoice Processing', 'Reading Forms', 'Handwritten Notes'],
                    isElite: true
                },
                {
                    title: 'AI Redact',
                    desc: 'Securely black out sensitive personal data.',
                    icon: EyeOff,
                    path: '/smart-redact',
                    useCases: ['Compliance', 'Privacy', 'Secure Sharing'],
                    isElite: true
                },
                {
                    title: 'Compare Versions',
                    desc: 'Highlight every change between document versions.',
                    icon: GitMerge,
                    path: '/neural-diff',
                    useCases: ['Agreement Tracking', 'Audit Trails', 'Revision Sync'],
                    isElite: true
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
                    useCases: ['Combining Reports', 'Bundling Files'],
                    isPopular: true
                },
                {
                    title: 'Split',
                    desc: 'Break large PDFs into smaller parts. Extract exactly the pages you need.',
                    icon: Scissors,
                    path: '/split',
                    useCases: ['Page Extraction', 'Topic Isolation'],
                    isPopular: true
                },
                {
                    title: 'Scanner',
                    desc: 'Convert paper documents into high-quality PDFs. AI enhancement ensures every scan is clear and professional.',
                    icon: Zap,
                    path: '/scanner',
                    useCases: ['Receipt Capture', 'Scanning Documents'],
                    isPopular: true
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
                    useCases: ['Contracts', 'Consent Forms'],
                    isElite: true
                },
                {
                    title: 'Watermark',
                    desc: 'Add custom text or image watermarks to your pages. Protect your documents with your brand or status.',
                    icon: Droplet,
                    path: '/watermark',
                    useCases: ['Branding', 'Document Status', 'Copyright']
                }
            ]
        }
    ];

    const filteredSections = sections.map(section => ({
        ...section,
        tools: section.tools.filter(tool =>
            (activeSection === 'all' || activeSection === section.id)
        )
    })).filter(section => section.tools.length > 0);

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-32 pt-32 relative overflow-hidden transition-colors duration-500">
            {/* Subtle Tech Grid matching core UI */}
            <div className="absolute inset-0 opacity-[0.3] dark:opacity-[0.2] pointer-events-none"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 50% 0%, rgba(0, 200, 150, 0.05) 0%, transparent 40%),
                        radial-gradient(var(--grid-dark) 1px, transparent 1px)
                    `,
                    backgroundSize: '100% 100%, 32px 32px'
                }}
            />

            <div className="max-w-2xl mx-auto px-6 relative z-10">
                <div className="space-y-12">
                    <div className="flex items-center gap-6 relative">
                        <motion.button
                            whileHover={{ scale: 1.1, x: -4 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/workspace')}
                            className="w-12 h-12 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center text-gray-500 dark:text-white border border-gray-100 dark:border-white/10 shadow-sm transition-all"
                        >
                            <ArrowLeft size={22} />
                        </motion.button>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Operation</span>
                                <div className="w-4 h-px bg-gray-200 dark:bg-white/10" />
                                <span className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">User Manual</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter text-black dark:text-white uppercase leading-none">Guide</h1>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="space-y-6">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mx-[-24px] px-6">
                            {['all', 'ai', 'core', 'security'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveSection(tab as any)}
                                    className={`px-6 py-2.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeSection === tab
                                        ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-lg'
                                        : 'bg-white/80 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/10 hover:border-[#00C896]/30'
                                        }`}
                                >
                                    {tab === 'ai' ? 'Pro & Neural' : tab === 'core' ? 'Core' : tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-16 pt-8">
                        {filteredSections.map((section) => (
                            <div key={section.id} className="space-y-8">
                                <div className="px-1 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        {section.id === 'ai' && <Sparkles size={14} className="text-[#00C896]" />}
                                        <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-black dark:text-white">
                                            {section.title}
                                        </h2>
                                        <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">
                                        {section.desc}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {section.tools.map((tool, i) => (
                                        <motion.div
                                            key={tool.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            whileHover={{ y: -2 }}
                                            className={`rounded-3xl group p-6 flex flex-col items-start gap-6 border transition-all duration-300 relative overflow-hidden bg-white/80 dark:bg-black/40 backdrop-blur-3xl border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl ${tool.isElite ? 'dark:border-[#00C896]/20' : ''
                                                }`}
                                        >
                                            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                                                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                                            </div>

                                            <div className="flex items-start gap-5 w-full">
                                                <div className={`w-12 h-12 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10 ${tool.isElite ? 'text-[#00C896]' : 'text-gray-400 dark:text-gray-500'
                                                    }`}>
                                                    <tool.icon size={24} strokeWidth={1.5} />
                                                </div>
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 className="text-[17px] font-black uppercase tracking-tight text-black dark:text-white leading-none">
                                                            {tool.title}
                                                        </h3>
                                                        {tool.isElite && (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#00C896]/10 border border-[#00C896]/20 rounded-lg">
                                                                <Sparkles size={8} className="text-[#00C896]" />
                                                                <span className="text-[7px] font-black text-[#00C896] uppercase tracking-widest">AI FEATURE</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 leading-snug">
                                                        {tool.desc}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {tool.useCases.map(uc => (
                                                            <span key={uc} className="text-[8px] font-mono font-black uppercase tracking-widest px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-lg text-gray-500 dark:text-gray-500 border border-black/5 dark:border-transparent">
                                                                {uc}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => navigate(tool.path)}
                                                className={`w-full py-4 rounded-2xl text-[9px] font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tool.isElite
                                                    ? 'bg-[#00C896] text-white shadow-lg'
                                                    : 'bg-black dark:bg-white text-white dark:text-black'
                                                    }`}
                                            >
                                                {tool.isElite ? 'Open AI Tool' : 'Open Tool'}
                                                <ChevronRight size={14} />
                                            </motion.button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredSections.length === 0 && (
                        <div className="text-center py-20 opacity-30 text-black dark:text-white">
                            <Info size={40} className="mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Guide Search Error: No Tools Found</p>
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
};

export default ProtocolGuideScreen;
