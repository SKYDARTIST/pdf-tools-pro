import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '@/services/googleAuthService';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * Automatically redirects the user to the Login Screen if they attempt to access
 * any protected route without being logged in.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const user = await getCurrentUser();
            console.log('🔍 ProtectedRoute: Auth check result:', user ? { uid: user.google_uid, email: user.email } : 'NOT_LOGGED_IN');
            if (user) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
            setIsVerifying(false);
        };
        checkAuth();
    }, []);

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log('🛡️ ProtectedRoute: Gating access, redirecting to /login from', location.pathname);
        // Store the attempted path so GoogleAuthCallback can return the user here after login
        localStorage.setItem('auth_redirect_path', location.pathname + location.search);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
