# Security-First Android Implementation Plan
**For: Gemini AI Assistant**
**Status**: Credentials Rotated ✅ | Ready for Implementation
**Date**: January 27, 2026

---

## Overview

This plan assumes:
✅ New API keys generated
✅ New Google Client ID generated
✅ VITE_GOOGLE_CLIENT_ID added to `.env.local`
✅ Backend env vars set on Vercel (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AG_PROTOCOL_SIGNATURE`)
✅ Google Client ID restricted to Android SHA-1 fingerprint in Google Cloud Console

**Remaining Work**: Android native fixes + Google Auth UI + Testing

---

## Phase 1: Verify Environment Setup (5 minutes)

### 1.1 Verify `.env.local`
```bash
# Should have:
VITE_GEMINI_API_KEY=AIzaSy... (NEW KEY)
VITE_GOOGLE_CLIENT_ID=577377406590-rcr0l7607ok07odbb9787017en9nikqp.apps.googleusercontent.com
VITE_BACKEND_URL=http://127.0.0.1:3001
VITE_SUPABASE_URL=https://eydbnogluccjhmofsnhu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (CORRECT KEY)
VITE_AG_PROTOCOL_SIGNATURE=fc8b2c89... (NEW SIGNATURE)
```

### 1.2 Verify Vercel Environment Variables
**Go to**: Vercel Dashboard → Settings → Environment Variables

**Should have these backend vars**:
```
GEMINI_API_KEY=<new_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_URL=https://eydbnogluccjhmofsnhu.supabase.co
AG_PROTOCOL_SIGNATURE=<new_signature>
```

### 1.3 Verify Google Cloud Console
**Go to**: Google Cloud Console → OAuth Credentials

**Check**:
- ✅ New Client ID created
- ✅ Android platform added with app's SHA-1 fingerprint
- ✅ Old Client ID disabled/deleted
- ✅ Authorized JavaScript origins updated

---

## Phase 2: Android Native Fixes (30 minutes)

### 2.1 Update `build.gradle` (Kotlin Version)

**File**: `android/app/build.gradle`

**Find**:
```gradle
ext {
    compileSdkVersion = 34
    minSdkVersion = 21
    targetSdkVersion = 34
    // ... other vars
}
```

**Update to**:
```gradle
ext {
    compileSdkVersion = 34
    minSdkVersion = 21
    targetSdkVersion = 34
    kotlinVersion = "1.9.22"  // ADD THIS LINE
    // ... other vars
}

dependencies {
    // Force stable Kotlin coroutines version
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1'
    // ... rest of dependencies
}
```

**Why**: Capacitor 8 requires Kotlin 1.9+. Stable coroutines version prevents NoClassDefFoundError.

### 2.2 Create patch-package Patch for Play Integrity Plugin

**Install patch-package**:
```bash
npm install patch-package --save-dev
```

**Locate plugin file**:
- On macOS/Linux: `node_modules/@capacitor-community/play-integrity/android/src/main/java/com/example/playintegrity/PlayIntegrityPlugin.java`

**Find the NullPointerException bug** (around line 50-60):
```java
// BUGGY CODE:
long googleCloudProjectNumber = call.getLong("googleCloudProjectNumber");
// Problem: getLong() returns Long object, calling longValue() on null crashes
```

**Fix it**:
```java
// FIXED CODE:
Long googleCloudProjectNumberObj = call.getLong("googleCloudProjectNumber");
if (googleCloudProjectNumberObj == null) {
    call.reject("googleCloudProjectNumber is required");
    return;
}
long googleCloudProjectNumber = googleCloudProjectNumberObj.longValue();
```

**Create patch**:
```bash
npx patch-package @capacitor-community/play-integrity
```

This creates `patches/@capacitor-community+play-integrity+X.X.X.patch`

**Verify patch is applied**:
```bash
npm install  # Patches auto-apply on install
```

---

## Phase 3: Google Authentication UI Implementation (1 hour)

### 3.1 Create AuthModal Component

**File**: `components/AuthModal.tsx`

```typescript
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { signInWithGoogle } from '../services/googleAuthService';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sign In to Use AI Features',
  message = 'Your AI credits and subscription sync across devices when you sign in'
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-sm w-full p-6">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {message}
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Google Sign In Button */}
              <div className="mb-6 flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setIsLoading(true);
                      setError(null);

                      if (credentialResponse.credential) {
                        const user = await signInWithGoogle(credentialResponse.credential);
                        if (user) {
                          console.log('✅ Signed in as:', user.email);
                          onSuccess();
                          onClose();
                        } else {
                          setError('Failed to sign in. Please try again.');
                        }
                      } else {
                        setError('No credential received. Please try again.');
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Sign in failed');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  onError={() => {
                    setError('Google sign-in failed. Please try again.');
                  }}
                  text="signin_with"
                  size="large"
                />
              </div>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                disabled={isLoading}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

### 3.2 Update `App.tsx` with GoogleOAuthProvider

**File**: `App.tsx`

**Find** the main App component declaration:
```typescript
const App: React.FC = () => {
```

**Wrap with GoogleOAuthProvider** (top-level wrapper):
```typescript
import { GoogleOAuthProvider } from '@react-oauth/google';

const AppContent: React.FC = () => {
  // ... existing App.tsx code
};

const App: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.error('VITE_GOOGLE_CLIENT_ID not configured');
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Configuration error</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AppContent />
    </GoogleOAuthProvider>
  );
};

export default App;
```

**In AppContent**, add FedCM fix:
```typescript
// Add this in React.useEffect during app initialization
React.useEffect(() => {
  // Disable FedCM on mobile WebView if it causes issues
  if ((window as any).Capacitor) {
    const style = document.createElement('meta');
    style.name = 'google-signin-disable-fedcm';
    style.content = 'true';
    document.head.appendChild(style);
  }
}, []);
```

### 3.3 Add AuthModal State to App

**In AppContent**, add to state:
```typescript
const [authModalOpen, setAuthModalOpen] = React.useState(false);

// Add to return JSX:
return (
  <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
    {/* ... existing content ... */}

    <AuthModal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      onSuccess={async () => {
        // Reload app data after login
        const user = await getCurrentUser();
        if (user) {
          await initSubscription(user);
          // Force re-render with new data
          window.location.reload();
        }
      }}
    />
  </div>
);
```

---

## Phase 4: Add Auth Checks to AI Tool Screens (45 minutes)

### 4.1 Create AI Tool Auth Wrapper Hook

**File**: `hooks/useAIAuth.ts`

```typescript
import { useState } from 'react';
import { getCurrentUser } from '../services/googleAuthService';
import { fetchUserSubscription } from '../services/subscriptionService';

export const useAIAuth = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const checkAndPrepareAI = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        // Not logged in - show auth modal
        setAuthModalOpen(true);
        return false;
      }

      // Logged in - fetch fresh subscription
      const sub = await fetchUserSubscription(user.google_uid);
      setSubscription(sub);
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  };

  return {
    authModalOpen,
    setAuthModalOpen,
    subscription,
    checkAndPrepareAI
  };
};
```

### 4.2 Update AI Tool Screens

**Apply to these screens**:
- Workspace (Anti-Gravity Workspace)
- Smart Redact
- Neural Diff
- Table Extractor
- Data Extractor
- Reader (for Briefing feature)

**Example - `screens/AntiGravityWorkspace.tsx`**:

```typescript
import { useAIAuth } from '../hooks/useAIAuth';

export const AntiGravityWorkspace: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, subscription, checkAndPrepareAI } = useAIAuth();

  const handleStartWorkspace = async () => {
    const isAuthed = await checkAndPrepareAI();
    if (!isAuthed) {
      return; // Modal will show
    }

    // User is logged in and subscription loaded
    // Proceed with workspace
    startWorkspaceSession();
  };

  return (
    <>
      <button onClick={handleStartWorkspace}>
        Open Workspace
      </button>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          // User is now logged in, restart workflow
          handleStartWorkspace();
        }}
      />
    </>
  );
};
```

**Repeat for all AI tools**: Replace the button click handler with `checkAndPrepareAI()` check.

---

## Phase 5: Testing (30 minutes)

### 5.1 Web Testing

```bash
# 1. Start dev server
npm run dev

# 2. Test Google Sign In
- Click AI tool button
- Modal should appear
- Click "Sign in with Google"
- Sign in with test account
- Modal should close
- Subscription should load from Supabase

# 3. Verify Supabase sync
- Go to Supabase dashboard
- Check user_accounts table
- Should see new user with google_uid, email, tier, etc.

# 4. Test persistence
- Refresh page
- User should still be logged in
- Subscription should still be loaded

# 5. Test logout
- Clear localStorage
- Refresh page
- Auth modal should reappear on next AI tool click
```

### 5.2 Android Testing

```bash
# 1. Build for Android
npx cap sync android
npx cap open android

# 2. In Android Studio:
- Select physical device or emulator
- Run app (Shift+F10)

# 3. Test on device:
- Click AI tool
- Modal should appear
- Click Google Sign In
- Should redirect to Google login
- After login, should return to app
- Subscription should load

# 4. Check logs:
adb logcat | grep "Anti-Gravity"
# Should see:
# - "GoogleAuth: Initializing secure session"
# - "Subscription: ✅ Restored from Supabase"
# - No errors or crashes

# 5. Verify APK doesn't contain old credentials:
# apktool d app-release.apk
# grep -r "AIzaSy" . # Should find NOTHING
# grep -r "eyJhbGc" . # Should find NOTHING
```

### 5.3 Verify Patches Applied

```bash
# After npm install, patches should auto-apply
# Verify:
cat node_modules/@capacitor-community/play-integrity/android/src/main/java/com/example/playintegrity/PlayIntegrityPlugin.java | grep -A 5 "googleCloudProjectNumber"
# Should see safe null-checking code
```

---

## Phase 6: Deployment (15 minutes)

### 6.1 Deploy to Web (Vercel)

```bash
# 1. Commit changes
git add .
git commit -m "feat: implement Google Auth + Android security fixes"

# 2. Push to main
git push origin main

# 3. Vercel auto-deploys
# Monitor: https://vercel.com/dashboard

# 4. Verify on production
- Visit: https://pdf-tools-pro-indol.vercel.app
- Test Google Sign In
- Check browser console for errors
```

### 6.2 Build & Deploy Android APK

```bash
# 1. Sync native code
npx cap sync android

# 2. Build release APK
cd android
./gradlew assembleRelease

# 3. Find APK
# Location: android/app/build/outputs/apk/release/app-release.apk

# 4. Test on device or upload to Play Store
adb install app-release.apk

# 5. Test on real device:
# - Install from Play Store or via adb
# - Test full flow
# - Check for crashes in Play Console
```

---

## Verification Checklist

### Security ✅
- [ ] New credentials rotated
- [ ] .env.local has new keys
- [ ] Vercel has backend env vars
- [ ] Google Client ID restricted to Android
- [ ] Old credentials disabled in Google Cloud
- [ ] APK decompilation shows NO hardcoded secrets

### Functionality ✅
- [ ] Google Sign In modal appears on AI tool click
- [ ] Sign In with Google works
- [ ] User data stored in Supabase user_accounts
- [ ] Subscription loads after login
- [ ] Credits sync to server
- [ ] Uninstall/reinstall preserves subscription

### Android Native ✅
- [ ] Kotlin 1.9.22 in build.gradle
- [ ] Play Integrity patch applied
- [ ] No NoClassDefFoundError
- [ ] No NullPointerException
- [ ] No FedCM errors on WebView

### Testing ✅
- [ ] Web: Google Sign In works
- [ ] Web: Subscription persists
- [ ] Web: Logout/refresh shows modal
- [ ] Android: Google Sign In works
- [ ] Android: No native crashes
- [ ] Android: Logs show proper flow
- [ ] Production: All features work

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `VITE_GOOGLE_CLIENT_ID undefined` | Missing in .env.local | Add to .env.local |
| `GoogleOAuthProvider error` | Client ID not configured | Verify VITE_GOOGLE_CLIENT_ID in App.tsx |
| `NullPointerException in Play Integrity` | Plugin not patched | Run `npx patch-package` and reinstall |
| `FedCM popup not appearing on Android` | WebView blocking | Add use_fedcm={false} or meta tag |
| `Subscription not loading` | API endpoint missing | Verify api/user/subscription.js exists |
| `NoClassDefFoundError` | Kotlin version mismatch | Update to 1.9.22 in build.gradle |

---

## Success Criteria

✅ **Everything works when**:
1. User clicks AI tool without being logged in
2. AuthModal appears
3. User signs in with Google
4. Modal closes
5. Subscription loads from Supabase
6. AI feature proceeds
7. Credits deducted after usage
8. Uninstall/reinstall preserves user account
9. No crashes on Android
10. No exposed credentials in APK

---

## Next Steps After Completion

1. Monitor Play Store console for crashes
2. Gather user feedback on sign-in flow
3. Track subscription sync success rate
4. Plan for future enhancements (two-factor auth, OAuth refresh tokens, etc.)

---

**Questions for Gemini before starting**:
- Do you see any missing dependencies in package.json?
- Should we test on Android emulator first or physical device?
- Do you want me to add error telemetry to track sign-in failures?
