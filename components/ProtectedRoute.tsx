import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../services/googleAuthService';
import { useAuthGate } from '../hooks/useAuthGate';
import { AuthModal } from '../components/AuthModal';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * Automatically challenges the user if they attempt to access any tool route without being logged in.
 * Ideal for handling deep links and direct URL navigation.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { authModalOpen, setAuthModalOpen, handleAuthSuccess } = useAuthGate();
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const user = await getCurrentUser();
            if (user) {
                setIsAuthenticated(true);
            } else {
                setAuthModalOpen(true);
            }
            setIsVerifying(false);
        };
        checkAuth();
    }, [setAuthModalOpen]);

    if (isVerifying) {
        return <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>;
    }

    if (!isAuthenticated) {
        return (
            <>
                <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center space-y-8">
                    <div className="text-emerald-500 text-6xl">🔒</div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Login Required</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                        Please sign in with Google to access this tool and manage your credits.
                    </p>
                    <button
                        onClick={() => setAuthModalOpen(true)}
                        className="px-10 py-4 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-2xl"
                    >
                        Sign In Now
                    </button>
                </div>
                <AuthModal
                    isOpen={authModalOpen}
                    onClose={() => {
                        // If they close without auth, redirect them home
                        window.location.href = '/';
                    }}
                    onSuccess={() => {
                        setIsAuthenticated(true);
                        handleAuthSuccess();
                    }}
                />
            </>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
