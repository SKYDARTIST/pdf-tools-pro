# Android Google Login Fix for Gemini

This document details the solution for fixing Google Sign-In issues on Android Capacitor builds, specifically for the Anti-Gravity project.

## 1. Problem Explanation
The standard "Sign In With Google" button (Google Identity Services / GIS) often fails inside Capacitor Android apps.
*   **Reason**: Google restricts OAuth requests from embedded web views (like Capacitor's standard view) for security reasons. Using the standard SDK often results in `disallowed_useragent` errors or simply fails to open the popup correctly because it tries to use an iframe/popup which the WebView handles poorly.

## 2. Solution Approach
Instead of using the Google Identity SDK's JavaScript button, we manually construct a standard **OAuth 2.0 Authorization URL** and perform a full-page redirect to it.
*   **Mechanism**: `window.location.href = googleAuthUrl`
*   **Flow**: App -> Google Auth Page (in WebView) -> User Signs In -> Redirect back to `/auth-callback` -> App processes token.
*   **Benefit**: Google sees this as a standard "top-level navigation" rather than an embedded iframe login, which is allowed.

## 3. Implementation Steps

### Step 1: Replace GoogleLogin with Custom Button in `AuthModal.tsx`

Remove the `<GoogleLogin />` component and replace it with a manual button that triggers our custom handler.

```tsx
{/* Google Sign In Button */}
<div className="mb-6 flex justify-center">
    <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className='w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
    >
        {/* Google Icon SVG */}
        <svg className='w-5 h-5' viewBox='0 0 24 24'>
            <path fill='currentColor' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
            <path fill='currentColor' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
            <path fill='currentColor' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
            <path fill='currentColor' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
        </svg>
        <span className="text-gray-700 dark:text-gray-200 font-medium">
            {isLoading ? 'Connecting...' : 'Sign In with Google'}
        </span>
    </button>
</div>
```

### Step 2: Add `handleGoogleSignIn` function
In `AuthModal.tsx`, implement the handler to redirect the user to Google's OAuth 2.0 endpoint.

```tsx
const handleGoogleSignIn = async () => {
    try {
        setIsLoading(true);
        setError(null);

        // Build Google OAuth URL
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = window.location.origin + '/auth-callback';
        const scope = 'openid profile email';

        // Using implicit flow (response_type=token) for client-side only auth
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;

        // Open in browser (triggers full page redirect)
        window.location.href = googleAuthUrl;
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign in failed');
        setIsLoading(false);
    }
};
```

### Step 3: Create `GoogleAuthCallback` Screen
Create `screens/GoogleAuthCallback.tsx` to handle the return redirect, extract the token from the URL hash, and create the user session.

```tsx
// screens/GoogleAuthCallback.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../services/googleAuthService';

const GoogleAuthCallback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get credential from URL hash (Google returns token here)
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                // Google returns 'access_token' or 'id_token'
                const credential = params.get('id_token') || params.get('access_token');

                if (credential) {
                    const user = await signInWithGoogle(credential);
                    if (user) {
                        console.log('✅ Signed in as:', user.email);
                        // Hard redirect to workspace to refresh all states
                        window.location.href = '/workspace';
                    } else {
                        console.error('Auth sync failed: No user returned');
                        navigate('/workspace'); // Fallback
                    }
                } else {
                    console.warn('No credential found in hash, redirecting back');
                    navigate('/workspace');
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                navigate('/workspace');
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className='min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center'>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">Processing Neural Link...</h2>
            <p className="text-gray-400">Authenticating secure session, please wait.</p>
        </div>
    );
};

export default GoogleAuthCallback;
```

## 4. Why It Works
Using `window.location.href` to navigate to `accounts.google.com` moves the entire WebView context to the Google domain.
-   Google detects this as a standard browser navigation, not an embedded `<iframe>` or popup.
-   This satisfies the "secure browser" requirements (since the WebView itself is based on Chrome).
-   When Google redirects back to `localhost/auth-callback` (or your app domain), the Capacitor app is reloaded or the router picks up the new URL, allowing us to capture the token from the URL hash.
