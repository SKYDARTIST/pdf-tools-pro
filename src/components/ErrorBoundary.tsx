import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Logger } from '@/utils/logger';

interface Props {
    children: React.ReactNode;
    /** Rendered instead of the default card when provided. */
    fallback?: React.ReactNode;
    /** Changing this value clears the error — pass the route so navigation recovers. */
    resetKey?: string;
}

interface State {
    hasError: boolean;
    message: string;
}

/**
 * Catches render/lifecycle errors in the routed screen.
 *
 * Without this, a single throw anywhere in ~34 screens unmounts the whole React
 * tree and leaves a blank WebView with no way out but force-quitting the app —
 * and because it is a WebView crash it never reaches Play Console vitals.
 *
 * Deliberately scoped inside the layout so Header/BottomNav survive and the
 * user can navigate to another tool instead of restarting.
 */
class ErrorBoundary extends React.Component<Props, State> {
    // This project has no @types/react installed, so React (and therefore
    // React.Component) is `any` and the inherited members are invisible to TS.
    // Declared here so the class type-checks; no runtime effect, since
    // useDefineForClassFields is false and these have no initializers.
    declare props: Props;
    declare setState: (state: Partial<State>) => void;

    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error?.message || 'Unknown error' };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        Logger.error('ErrorBoundary', 'Screen crashed', {
            message: error?.message,
            stack: error?.stack,
            componentStack: info?.componentStack,
        });
    }

    componentDidUpdate(prevProps: Props) {
        // Navigating to a different screen should clear a latched error,
        // otherwise the user stays stuck on the error card.
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, message: '' });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, message: '' });
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        if (this.props.fallback) return <>{this.props.fallback}</>;

        return (
            <div className="min-h-[60vh] flex items-center justify-center px-6">
                <div className="monolith-card p-8 max-w-md w-full space-y-6 border-none shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                        <AlertTriangle size={28} />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-black tracking-tighter uppercase text-gray-900 dark:text-white">
                            This tool hit a snag
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                            Your files are untouched and never left this device. Try again, or pick another tool below.
                        </p>
                    </div>

                    <button
                        onClick={this.handleRetry}
                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <RotateCcw size={14} />
                        Try again
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
