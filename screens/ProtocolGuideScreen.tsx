Droplet, FileImage, Trash2, Hash, Shield, Search, Sparkles, Database,
    GitMerge, EyeOff, Headphones, ArrowLeft, ChevronRight, Info
} from 'lucide-react';
import NeuralPulse from '../components/NeuralPulse';


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
                    desc: 'Chat with your documents for instant answers.',
                    icon: Sparkles,
                    path: '/ag-workspace',
                    useCases: ['Contract Analysis', 'Study Summaries', 'Data Querying'],
                    isElite: true
                },
                {
                    title: 'AI Audit',
                    desc: 'Expose hidden risks and financial gaps in fine print.',
                    icon: Shield,
                    path: '/reader?protocol=audit',
                    useCases: ['Risk Assessment', 'Legal Review', 'Cost Auditing'],
                    isElite: true
                },
                {
                    title: 'Data Extractor',
                    desc: 'Turn messy scans and handwriting into sharp data.',
                    icon: Database,
                    path: '/data-extractor',
                    useCases: ['Invoice Processing', 'Medical OCR', 'Handwritten Notes'],
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
                    title: 'AI Diff',
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
                },
                {
                    title: 'PDF Metadata',
                    desc: 'View or edit the hidden details of your PDF like Title and Author. Keep your files professional and organized.',
                    icon: FileText,
                    path: '/metadata',
                    useCases: ['Privacy', 'Clean Exports', 'File Info'],
                    isElite: true
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
                        <div className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-gray-500">Operation Manual</div>
                        <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Guide</h1>
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
                            <div className="px-2 flex items-center gap-3">
                                {section.id === 'ai' && <NeuralPulse color="bg-emerald-500" size="sm" />}
                                <div className="space-y-1">
                                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">
                                        {section.title}
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        {section.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {section.tools.map((tool, i) => (
                                    <motion.div
                                        key={tool.title}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`monolith-glass rounded-[40px] group p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-none shadow-sm hover:shadow-xl transition-all relative overflow-hidden ${tool.isElite ? 'shadow-[0_0_40px_rgba(16,185,129,0.05)] border-emerald-500/10' : ''
                                            }`}
                                    >
                                        {tool.isElite && (
                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20" />
                                        )}
                                        <div className="flex items-start gap-5 flex-1">
                                            <div className={`w-14 h-14 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all ${tool.isElite ? 'text-emerald-500 ring-2 ring-emerald-500/20' : ''
                                                }`}>
                                                <tool.icon size={28} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-none">
                                                        {tool.title}
                                                    </h3>
                                                    {tool.isElite && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                                                            <Sparkles size={8} className="text-emerald-500 animate-pulse" />
                                                            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">ELITE AI</span>
                                                        </div>
                                                    )}
                                                    {tool.isPopular && !tool.isElite && (
                                                        <div className="px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full">
                                                            <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">POPULAR</span>
                                                        </div>
                                                    )}
                                                </div>
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
                                            className={`w-full md:w-auto px-6 py-3 rounded-full text-[9px] font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-xl ${tool.isElite
                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                                    : 'bg-black dark:bg-white text-white dark:text-black'
                                                }`}
                                        >
                                            {tool.isElite ? 'Deploy Assistant' : 'Open Tool'}
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


            </div>
        </div>
    );
};

export default ProtocolGuideScreen;
