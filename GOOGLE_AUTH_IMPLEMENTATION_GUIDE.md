# Google Authentication Implementation Guide
**For: Gemini AI Assistant**
**Date**: January 27, 2026
**Status**: Ready for Implementation

---

## Overview: Why This Change

**Current Problem (Device-Based Auth)**:
- Users can reset device ID by uninstalling/reinstalling app
- Grants full AI credits on every install (cheating vulnerability)
- Credits stored locally (modifiable)
- No tie to actual user identity

**Solution (Google Account Auth)**:
- Users login with Google account
- Account persists across devices and reinstalls
- Credits tied to Google UID (server-side source of truth)
- Payment verified through Google Play (real bank account)

---

## Architecture Overview

### Before (Device-Based)
```
┌──────────────────┐
│  Device 1        │
│  Device ID: ABC  │
│  Credits: 100    │ (localStorage)
└──────────────────┘
     Uninstall & Reinstall
         ↓
┌──────────────────┐
│  Device 1        │
│  Device ID: XYZ  │ (New ID!)
│  Credits: 100    │ (Full reset!)
└──────────────────┘
```

### After (Google Auth)
```
┌──────────────────┐         ┌──────────────────┐
│  Device 1        │         │  Device 2        │
│  Google UID: 123 │         │  Google UID: 123 │ (Same user!)
│  User logged in  │         │  User logged in  │
└──────────────────┘         └──────────────────┘
        ↓                            ↓
   ┌─────────────────────────────────────────┐
   │ Supabase user_accounts Table            │
   │ google_uid: 123                         │
   │ email: user@example.com                 │
   │ tier: PRO                               │
   │ ai_pack_credits: 87                     │
   │ last_login: 2026-01-27T...              │
   └─────────────────────────────────────────┘
```

---

## Phase 1: Setup Google Authentication

### 1.1 Install Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@react-oauth/google": "^0.12.0",
    "firebase": "^10.7.0",
    "@supabase/auth-helpers-react": "^0.4.5"
  }
}
```

Run: `npm install`

### 1.2 Create Google OAuth Credentials

**Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google Identity" API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:5173`
   - `https://pdf-tools-pro.vercel.app`
   - `https://pdf-tools-pro-indol.vercel.app`
6. Copy **Client ID** (you'll need this)

### 1.3 Create Google Authentication Service

**File**: `services/googleAuthService.ts`

```typescript
import { useGoogleLogin } from '@react-oauth/google';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface GoogleUser {
  google_uid: string;
  email: string;
  name: string;
  picture: string;
}

/**
 * Exchange Google credential for Supabase session
 */
export const signInWithGoogle = async (credential: string): Promise<GoogleUser | null> => {
  try {
    // Verify credential with Google backend
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: credential })
    });

    if (!response.ok) {
      console.error('Google Auth: Token verification failed');
      return null;
    }

    const decoded = await response.json();
    const googleUid = decoded.sub; // Google's unique ID
    const email = decoded.email;
    const name = decoded.name;
    const picture = decoded.picture;

    // Create or update user in Supabase
    const { data: user, error } = await supabase
      .from('user_accounts')
      .upsert([{
        google_uid: googleUid,
        email,
        name,
        picture,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString() // Only set on insert
      }], {
        onConflict: 'google_uid'
      })
      .select()
      .single();

    if (error) {
      console.error('Google Auth: Supabase insert failed', error);
      return null;
    }

    // Store session info locally
    localStorage.setItem('google_uid', googleUid);
    localStorage.setItem('user_email', email);

    return { google_uid: googleUid, email, name, picture };
  } catch (error) {
    console.error('Google Auth: Sign in error', error);
    return null;
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<GoogleUser | null> => {
  const googleUid = localStorage.getItem('google_uid');
  if (!googleUid) return null;

  try {
    const { data: user, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('google_uid', googleUid)
      .single();

    if (error || !user) return null;

    return user as GoogleUser;
  } catch (error) {
    console.error('Google Auth: Get user error', error);
    return null;
  }
};

/**
 * Logout user
 */
export const logout = (): void => {
  localStorage.removeItem('google_uid');
  localStorage.removeItem('user_email');
  window.location.reload();
};
```

---

## Phase 2: Create User Accounts Table

### 2.1 Database Schema

**File**: Migration or Supabase SQL Editor

```sql
-- Create user_accounts table (replaces device-based ag_user_usage)
CREATE TABLE IF NOT EXISTS user_accounts (
  google_uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  tier TEXT NOT NULL DEFAULT 'FREE', -- FREE, PRO, PREMIUM, LIFETIME
  ai_pack_credits INTEGER DEFAULT 0,
  operations_today INTEGER DEFAULT 0,
  ai_docs_weekly INTEGER DEFAULT 0,
  ai_docs_monthly INTEGER DEFAULT 0,
  last_operation_reset TIMESTAMP DEFAULT NOW(),
  last_ai_weekly_reset TIMESTAMP DEFAULT NOW(),
  last_ai_monthly_reset TIMESTAMP DEFAULT NOW(),
  trial_start_date TIMESTAMP,
  has_received_bonus BOOLEAN DEFAULT FALSE,
  purchase_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_tier ON user_accounts(tier);

-- Migrate existing device data (optional - for existing users)
-- INSERT INTO user_accounts (google_uid, email, tier, ai_pack_credits, ...)
-- SELECT device_id, 'unknown@example.com', tier, ai_pack_credits, ...
-- FROM ag_user_usage;
```

### 2.2 Enable RLS (Row Level Security)

```sql
-- Only users can see their own data
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON user_accounts
  FOR SELECT
  USING (google_uid = auth.uid());

CREATE POLICY "Users can update their own data"
  ON user_accounts
  FOR UPDATE
  USING (google_uid = auth.uid());
```

---

## Phase 3: Update Services Layer

### 3.1 Update subscriptionService.ts

**Replace device-based logic with Google UID:**

```typescript
import { GoogleUser } from './googleAuthService';

export interface UserSubscription {
  google_uid: string;  // NEW: Google UID instead of device_id
  tier: SubscriptionTier;
  operationsToday: number;
  aiDocsThisWeek: number;
  aiDocsThisMonth: number;
  aiPackCredits: number;
  lastOperationReset: string;
  lastAiWeeklyReset: string;
  lastAiMonthlyReset: string;
  trialStartDate?: string;
  hasReceivedBonus: boolean;
}

// Get current user's subscription from Supabase
export const initSubscription = async (googleUser: GoogleUser): Promise<UserSubscription> => {
  try {
    const subscription = await fetchUserSubscription(googleUser.google_uid);
    if (subscription) {
      console.log('Subscription: ✅ Loaded from Supabase:', subscription);
      return subscription;
    }
  } catch (e) {
    console.error('Subscription: Failed to load:', e);
  }

  // Fallback to defaults
  return getDefaultSubscription(googleUser);
};

// Fetch user's subscription from Supabase
export const fetchUserSubscription = async (googleUid: string): Promise<UserSubscription | null> => {
  try {
    const response = await fetch('/api/user/subscription', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${googleUid}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Subscription: Fetch error', error);
    return null;
  }
};

// Save subscription back to Supabase
export const saveSubscription = async (googleUid: string, subscription: UserSubscription): Promise<void> => {
  try {
    await fetch('/api/user/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleUid}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
  } catch (error) {
    console.error('Subscription: Save error', error);
  }
};

// Check if user can use AI
export const canUseAI = (subscription: UserSubscription): boolean => {
  if (subscription.tier === SubscriptionTier.PREMIUM || subscription.tier === SubscriptionTier.LIFETIME) {
    return true;
  }

  if (subscription.aiPackCredits > 0) {
    return true;
  }

  if (subscription.tier === SubscriptionTier.PRO && subscription.aiDocsThisMonth < 10) {
    return true;
  }

  if (subscription.tier === SubscriptionTier.FREE && subscription.aiDocsThisWeek < 1) {
    return true;
  }

  return false;
};

// Deduct AI credit
export const recordAIUsage = async (googleUid: string, subscription: UserSubscription): Promise<void> => {
  if (subscription.aiPackCredits > 0) {
    subscription.aiPackCredits -= 1;
  } else if (subscription.tier === SubscriptionTier.FREE) {
    subscription.aiDocsThisWeek += 1;
  } else if (subscription.tier === SubscriptionTier.PRO) {
    subscription.aiDocsThisMonth += 1;
  }

  await saveSubscription(googleUid, subscription);
};
```

### 3.2 Update usageService.ts (Rename/Refactor)

Since we're no longer using device-based tracking, simplify this:

```typescript
/**
 * User Usage Service - Now uses Google Auth
 * No longer needs device ID generation or mock tokens
 */

export const fetchUserUsage = async (googleUid: string): Promise<UserSubscription | null> => {
  try {
    const response = await fetch('/api/user/usage', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${googleUid}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Usage: Fetch error', error);
    return null;
  }
};

export const syncUsageToServer = async (googleUid: string, usage: UserSubscription): Promise<void> => {
  try {
    const response = await fetch('/api/user/usage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleUid}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(usage)
    });

    if (!response.ok) {
      console.error('Usage: Sync failed', response.statusText);
    }
  } catch (error) {
    console.error('Usage: Sync error', error);
  }
};
```

---

## Phase 4: Update Backend API

### 4.1 Replace `api/index.js` with Google Auth Endpoints

**New API routes**:

```javascript
// api/user/subscription.js
export default async function handler(req, res) {
  const googleUid = req.headers['authorization']?.replace('Bearer ', '');

  if (!googleUid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Fetch subscription
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('google_uid', googleUid)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Update subscription
    const subscription = req.body;

    const { error } = await supabase
      .from('user_accounts')
      .update({
        tier: subscription.tier,
        ai_pack_credits: subscription.aiPackCredits,
        operations_today: subscription.operationsToday,
        ai_docs_weekly: subscription.aiDocsThisWeek,
        ai_docs_monthly: subscription.aiDocsThisMonth,
        last_operation_reset: subscription.lastOperationReset,
        last_ai_weekly_reset: subscription.lastAiWeeklyReset,
        last_ai_monthly_reset: subscription.lastAiMonthlyReset,
        has_received_bonus: subscription.hasReceivedBonus,
        updated_at: new Date().toISOString()
      })
      .eq('google_uid', googleUid);

    if (error) {
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.status(200).json({ success: true });
  }
}
```

### 4.2 Update Billing Service

```typescript
// services/billingService.ts - Updated for Google Auth
import { GoogleUser } from './googleAuthService';

export const handleProPurchase = async (googleUser: GoogleUser, purchaseToken: string) => {
  try {
    // Verify purchase with Google Play
    const isValid = await verifyGooglePlayPurchase(purchaseToken);

    if (!isValid) {
      return { success: false, error: 'Invalid purchase token' };
    }

    // Update user tier to PRO
    const response = await fetch('/api/user/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleUser.google_uid}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tier: 'PRO',
        purchase_token: purchaseToken
      })
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to upgrade' };
    }

    return { success: true };
  } catch (error) {
    console.error('Billing: Purchase error', error);
    return { success: false, error: error.message };
  }
};

export const handleAIPackPurchase = async (googleUser: GoogleUser, purchaseToken: string) => {
  try {
    // Verify purchase with Google Play
    const isValid = await verifyGooglePlayPurchase(purchaseToken);

    if (!isValid) {
      return { success: false, error: 'Invalid purchase token' };
    }

    // Get current subscription and add credits
    const response = await fetch('/api/user/subscription', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${googleUser.google_uid}`
      }
    });

    const subscription = await response.json();
    subscription.aiPackCredits = (subscription.ai_pack_credits || 0) + 100;

    // Update subscription
    const updateResponse = await fetch('/api/user/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleUser.google_uid}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (!updateResponse.ok) {
      return { success: false, error: 'Failed to add credits' };
    }

    return { success: true };
  } catch (error) {
    console.error('Billing: AI Pack error', error);
    return { success: false, error: error.message };
  }
};
```

---

## Phase 5: Update React Components

### 5.1 Create Login Component

**File**: `components/GoogleLoginButton.tsx`

```typescript
import { GoogleLogin } from '@react-oauth/google';
import { signInWithGoogle } from '../services/googleAuthService';

export const GoogleLoginButton: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (credentialResponse.credential) {
          const user = await signInWithGoogle(credentialResponse.credential);
          if (user) {
            console.log('Logged in as:', user.email);
            onSuccess();
          }
        }
      }}
      onError={() => console.log('Login Failed')}
    />
  );
};
```

### 5.2 Update App.tsx Bootstrap

```typescript
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getCurrentUser } from './services/googleAuthService';

const App: React.FC = () => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const init = async () => {
      // Check if user is logged in
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Load subscription data
        await initSubscription(currentUser);
      }
      setIsLoading(false);
    };

    init();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <GoogleLoginButton onSuccess={() => window.location.reload()} />;
  }

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      {/* App content */}
    </GoogleOAuthProvider>
  );
};
```

### 5.3 Update AI Tool Screens

**Before trying to use AI**:
```typescript
// In any AI tool screen
import { canUseAI, recordAIUsage } from '../services/subscriptionService';
import { getCurrentUser } from '../services/googleAuthService';

const handleUseAI = async () => {
  const user = await getCurrentUser();
  if (!user) {
    showLoginModal();
    return;
  }

  const subscription = await fetchUserSubscription(user.google_uid);

  if (!canUseAI(subscription)) {
    showUpgradeModal(subscription.tier);
    return;
  }

  // Use AI
  const result = await runAI(file);

  // Record usage
  await recordAIUsage(user.google_uid, subscription);
};
```

---

## Phase 6: Migration Plan (Optional)

### For Existing Users with Device-Based Auth

```sql
-- Option 1: Auto-migrate on first Google login
-- If device_id exists but google_uid doesn't, link them
UPDATE user_accounts
SET google_uid = 'new_google_uid'
WHERE google_uid IS NULL
  AND device_id = 'old_device_id';

-- Option 2: Manual migration (safest)
-- Create mapping table and migrate gradually
CREATE TABLE device_to_user_mapping (
  device_id TEXT PRIMARY KEY,
  google_uid TEXT NOT NULL,
  migrated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Checklist

- [ ] User can login with Google
- [ ] User data persists in Supabase
- [ ] Logout clears session
- [ ] Cannot use AI without login
- [ ] AI credits deducted on usage
- [ ] Credits sync to server
- [ ] Uninstall/reinstall preserves credits
- [ ] User can login on multiple devices
- [ ] Purchase Pro → tier updates
- [ ] Purchase AI Pack → credits add
- [ ] Rate limiting works
- [ ] Session tokens expire correctly

---

## Security Notes

✅ **Improvements with Google Auth:**
- Google UID is tied to actual Google account
- Credentials verified by Google's servers
- Bank account verified (if using Google Play Payment)
- Can't spoof by uninstall/reinstall
- All data server-side (Supabase)

⚠️ **Still to address:**
- Rotate API keys in Vercel
- Remove fallback hardcoded secrets
- Mask device IDs in logs
- Disable persistent logging in production

---

## Dependencies to Install

```bash
npm install @react-oauth/google firebase @supabase/auth-helpers-react
```

---

## Next Steps

1. Set up Google OAuth credentials (15 min)
2. Create Supabase `user_accounts` table (10 min)
3. Implement googleAuthService.ts (30 min)
4. Update subscriptionService.ts (30 min)
5. Create API endpoints (30 min)
6. Update React components (1 hour)
7. Test end-to-end (1 hour)
8. Deploy to Vercel (15 min)

**Estimated Total**: 4-5 hours
