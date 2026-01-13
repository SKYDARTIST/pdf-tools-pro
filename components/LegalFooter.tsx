import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LegalFooter: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const links = [
        { name: 'Privacy Manifesto', path: '/manifesto' },
        { name: 'Privacy Policy', path: '/legal/privacy' },
        { name: 'Terms of Service', path: '/legal/terms' },
        { name: 'Contact Lead', path: 'https://x.com/Cryptobullaaa', external: true }
    ];

    return (
        <footer className="w-full py-12 px-6 border-t border-black/5 dark:border-white/5 bg-transparent">
            <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                {/* Legal Links */}
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                    {links.map((item) => (
                        <motion.div key={item.name} whileHover={{ y: -1 }}>
                            {item.external ? (
                                <a
                                    href={item.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-emerald-500 transition-all opacity-40 hover:opacity-100"
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <Link
                                    to={item.path}
                                    className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-all opacity-40 hover:opacity-100"
                                >
                                    {item.name}
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Brand Layer */}
                <div className="flex flex-col items-center gap-3 opacity-20">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">
                            Anti-Gravity AI v2.1.0
                        </span>
                    </div>
                    <a
                        href="https://x.com/Cryptobullaaa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[8px] font-black uppercase tracking-[0.5em] text-gray-500 px-4 py-1 border border-black/5 dark:border-white/5 rounded-full hover:border-emerald-500/30 hover:text-emerald-500 transition-all"
                    >
                        © {currentYear} Built By Cryptobulla
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default LegalFooter;
