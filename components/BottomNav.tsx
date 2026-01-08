import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutGrid, FolderOpen, Settings } from 'lucide-react';

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/workspace', icon: Home, label: 'Home' },
        { path: '/tools', icon: LayoutGrid, label: 'Tools' },
        { path: '/my-files', icon: FolderOpen, label: 'Files' },
        { path: '/ai-settings', icon: Settings, label: 'Settings' },
    ];

    const isPathActive = (path: string) => {
        if (path === '/tools') {
            return location.pathname === '/tools' ||
                (!['/workspace', '/', '/my-files', '/ai-settings', '/pricing', '/ag-workspace'].includes(location.pathname));
        }
        return location.pathname === path;
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-sm pointer-events-none">
            <motion.nav
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="monolith-glass rounded-full h-16 px-2 flex items-center justify-around shadow-2xl pointer-events-auto"
            >
                {navItems.map((item) => {
                    const active = isPathActive(item.path);
                    return (
                        <motion.button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            whileTap={{ scale: 0.9 }}
                            aria-label={item.label}
                            className="relative flex items-center justify-center w-12 h-12 rounded-full"
                        >
                            <AnimatePresence>
                                {active && (
                                    <motion.div
                                        layoutId="navIndicator"
                                        className="absolute inset-0 bg-black dark:bg-white rounded-full z-0 shadow-lg neural-glow"
                                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                    />
                                )}
                            </AnimatePresence>

                            <item.icon
                                size={20}
                                className={`relative z-10 transition-colors duration-300 ${active ? 'text-white dark:text-black' : 'text-gray-400 dark:text-gray-600'}`}
                                strokeWidth={active ? 2.5 : 2}
                            />

                            {active && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-black dark:bg-white"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </motion.nav>
        </div>
    );
};

export default BottomNav;
