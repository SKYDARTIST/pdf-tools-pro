# EXECUTION PLAN: Full Payment System Simplification

## ⚠️ CRITICAL: READ THIS FIRST

**APPROACH**: Full simplification - Remove ALL counters and complexity

**DO NOT** keep any counter logic (operationsToday, aiDocsThisMonth, etc.)
**DO NOT** use conservative approach that preserves counters
**DO** remove all 7 counter columns from database
**DO** simplify to pure tier-based checking only

---

## Goal

Transform from complex 3-tier system with 7 counters to simple 2-tier system with NO counters.

**BEFORE**:
- Tiers: Free, Pro (Monthly), Lifetime
- Counters: 7 fields (operationsToday, aiDocsThisMonth, aiDocsThisWeek, aiPackCredits, + 3 reset timestamps)
- Permission logic: Complex counter checks with sync issues

**AFTER**:
- Tiers: Free, Lifetime ($29.99)
- Counters: ZERO (all removed)
- Permission logic: Simple `tier === 'lifetime'` check

---

## Phase 1: Google Play Console Configuration

**IMPORTANT**: You can edit existing products - no need to create new ones.

### Step 1.1: Update Lifetime Product

1. Open: https://play.google.com/console
2. Select: Your app (Anti-Gravity PDF Tools Pro)
3. Navigate: **Monetize** → **Products** → **In-app products**
4. Find: `lifetime_pro_access`
5. Click: **Edit**
6. Update price: **$29.99 USD**
7. Save changes

**Expected**: Price change propagates in 2-4 hours

### Step 1.2: Deactivate Monthly Subscription

1. Navigate: **Monetize** → **Products** → **Subscriptions**
2. Find: `monthly_pro_pass` (or similar)
3. Click: **Deactivate**

**Note**: If you have existing subscribers, keep it active in Console but we'll hide it from app UI.

### Verification Checkpoint 1

```
✅ Lifetime product price = $29.99
✅ Monthly subscription deactivated or hidden
✅ Ready to proceed to database changes
```

---

## Phase 2: Database Schema Migration

**CRITICAL**: This removes ALL counter columns from Supabase.

### Step 2.1: Backup Database

1. Open Supabase Dashboard: https://supabase.com
2. Select your project
3. Go to: **Project Settings** → **Backups**
4. Note the latest backup time

**OR create manual backup**:

```sql
-- Execute in Supabase SQL Editor
CREATE TABLE user_accounts_backup_20260201 AS
SELECT * FROM user_accounts;

-- Verify backup
SELECT COUNT(*) FROM user_accounts_backup_20260201;
```

### Step 2.2: Execute Migration SQL

**Execute in Supabase SQL Editor:**

```sql
-- ============================================
-- MIGRATION: Remove All Counter Columns
-- Date: 2026-02-01
-- Purpose: Simplify to tier-only system
-- ============================================

-- STEP 1: Remove counter columns
ALTER TABLE user_accounts
DROP COLUMN IF EXISTS operations_today,
DROP COLUMN IF EXISTS ai_docs_this_week,
DROP COLUMN IF EXISTS ai_docs_this_month,
DROP COLUMN IF EXISTS ai_pack_credits,
DROP COLUMN IF EXISTS last_operation_reset,
DROP COLUMN IF EXISTS last_ai_weekly_reset,
DROP COLUMN IF EXISTS last_ai_monthly_reset;

-- STEP 2: Normalize tier values (convert 'pro' to 'lifetime' if any exist)
UPDATE user_accounts
SET tier = 'lifetime'
WHERE tier = 'pro';

-- STEP 3: Set default tier for any NULL values
UPDATE user_accounts
SET tier = 'free'
WHERE tier IS NULL;

-- STEP 4: Verify migration
SELECT tier, COUNT(*) as user_count
FROM user_accounts
GROUP BY tier
ORDER BY tier;

-- STEP 5: Check final schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_accounts'
ORDER BY ordinal_position;
```

### Step 2.3: Verify Migration Success

**Expected schema after migration**:

```
Column Name    | Data Type
---------------|----------
google_uid     | text
email          | text
tier           | text
created_at     | timestamp
updated_at     | timestamp
```

**Expected tier distribution**:

```
tier     | user_count
---------|----------
free     | X
lifetime | Y
```

**NO** other tiers (no 'pro'), **NO** counter columns.

### Verification Checkpoint 2

```
✅ Counter columns removed from database
✅ Only 'free' and 'lifetime' tiers exist
✅ Backup created successfully
✅ Ready to proceed to code changes
```

---

## Phase 3: Code Changes - Type Definitions

### Step 3.1: Update Subscription Types

**File**: `src/types/subscription.ts`

**FIND AND REPLACE ENTIRE FILE CONTENT**:

```typescript
/**
 * Subscription Types - Simplified (2-Tier System)
 */

export type SubscriptionTier = 'free' | 'lifetime';

export interface UserSubscription {
  tier: SubscriptionTier;
}

export interface SubscriptionLimits {
  canUseAI: boolean;
}

export const TIER_FEATURES = {
  free: {
    pdfTools: true,
    aiFeatures: false,
  },
  lifetime: {
    pdfTools: true,
    aiFeatures: true,
  },
} as const;
```

**VERIFICATION**: Ensure TypeScript compiles without errors related to removed counter fields.

### Verification Checkpoint 3

```
✅ SubscriptionTier type updated to 'free' | 'lifetime' only
✅ UserSubscription interface simplified to tier only
✅ No TypeScript errors
✅ Ready to update services
```

---

## Phase 4: Code Changes - Subscription Service

### Step 4.1: Complete Rewrite of subscriptionService.ts

**File**: `src/services/subscriptionService.ts`

**REPLACE ENTIRE FILE WITH**:

```typescript
/**
 * Subscription Service - Simplified (2-Tier System)
 *
 * NO counters, NO limits, NO sync complexity
 * Just tier checking: Free or Lifetime
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';
import { UserSubscription, SubscriptionTier } from '../types/subscription';

const STORAGE_KEY = '@subscription_tier';

class SubscriptionService {
  private currentTier: SubscriptionTier = 'free';
  private initialized = false;

  /**
   * Initialize subscription from cache or server
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load from cache first
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        this.currentTier = cached as SubscriptionTier;
      }

      // Fetch fresh data from server in background
      this.fetchFromServer().catch(err => {
        console.warn('[Subscription] Background fetch failed:', err);
      });

      this.initialized = true;
    } catch (err) {
      console.error('[Subscription] Initialize error:', err);
      this.currentTier = 'free';
      this.initialized = true;
    }
  }

  /**
   * Get current subscription tier
   */
  async getTier(): Promise<SubscriptionTier> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.currentTier;
  }

  /**
   * Get full subscription object
   */
  async getSubscription(): Promise<UserSubscription> {
    const tier = await this.getTier();
    return { tier };
  }

  /**
   * Check if user can use AI features
   */
  async canUseAI(): Promise<boolean> {
    const tier = await this.getTier();
    return tier === 'lifetime';
  }

  /**
   * Update tier (call after purchase)
   */
  async updateTier(newTier: SubscriptionTier): Promise<void> {
    try {
      this.currentTier = newTier;
      await AsyncStorage.setItem(STORAGE_KEY, newTier);

      // Update server in background
      this.syncToServer(newTier).catch(err => {
        console.error('[Subscription] Server sync failed:', err);
      });

      console.log('[Subscription] Tier updated to:', newTier);
    } catch (err) {
      console.error('[Subscription] Update tier error:', err);
      throw err;
    }
  }

  /**
   * Fetch tier from server
   */
  private async fetchFromServer(): Promise<SubscriptionTier> {
    try {
      const googleUid = await this.getGoogleUid();
      if (!googleUid) {
        return 'free';
      }

      const { data, error } = await supabase
        .from('user_accounts')
        .select('tier')
        .eq('google_uid', googleUid)
        .single();

      if (error || !data) {
        console.warn('[Subscription] Server fetch failed:', error);
        return 'free';
      }

      const tier = data.tier as SubscriptionTier;

      // Update cache
      this.currentTier = tier;
      await AsyncStorage.setItem(STORAGE_KEY, tier);

      return tier;
    } catch (err) {
      console.error('[Subscription] Fetch error:', err);
      return 'free';
    }
  }

  /**
   * Sync tier to server
   */
  private async syncToServer(tier: SubscriptionTier): Promise<void> {
    try {
      const googleUid = await this.getGoogleUid();
      if (!googleUid) {
        throw new Error('No Google UID available');
      }

      const { error } = await supabase
        .from('user_accounts')
        .upsert({
          google_uid: googleUid,
          tier: tier,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log('[Subscription] Synced to server:', tier);
    } catch (err) {
      console.error('[Subscription] Sync error:', err);
      throw err;
    }
  }

  /**
   * Reset subscription (call on logout)
   */
  async reset(): Promise<void> {
    this.currentTier = 'free';
    this.initialized = false;
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[Subscription] Reset to free tier');
  }

  /**
   * Force refresh from server
   */
  async refresh(): Promise<void> {
    const tier = await this.fetchFromServer();
    console.log('[Subscription] Refreshed tier:', tier);
  }

  /**
   * Get Google UID from storage or auth service
   */
  private async getGoogleUid(): Promise<string | null> {
    try {
      const uid = await AsyncStorage.getItem('@google_uid');
      return uid;
    } catch (err) {
      console.error('[Subscription] Get UID error:', err);
      return null;
    }
  }
}

export default new SubscriptionService();
```

**WHAT WAS REMOVED**:
- ✅ All counter increment/decrement logic (~120 lines)
- ✅ All reset timestamp checking (~50 lines)
- ✅ All daily/weekly/monthly limit logic (~80 lines)
- ✅ All counter sync complexity (~100 lines)
- ✅ Total: ~350 lines of complex logic DELETED

**WHAT REMAINS**:
- ✅ Simple tier fetching (~150 lines)
- ✅ Simple tier caching
- ✅ Simple permission check: `tier === 'lifetime'`

### Verification Checkpoint 4

```
✅ subscriptionService.ts completely rewritten
✅ All counter logic removed
✅ Simple tier-based checking implemented
✅ No TypeScript errors
✅ Ready to update usage service
```

---

## Phase 5: Code Changes - Usage Service

### Step 5.1: Simplify usageService.ts

**File**: `src/services/usageService.ts`

**REPLACE ENTIRE FILE WITH**:

```typescript
/**
 * Usage Service - Simplified (2-Tier System)
 *
 * NO usage tracking, NO counters
 * Just tier syncing
 */

import subscriptionService from './subscriptionService';

class UsageService {
  /**
   * Sync tier from server (call on app startup)
   */
  async syncFromServer(): Promise<void> {
    try {
      await subscriptionService.refresh();
      console.log('[Usage] Synced tier from server');
    } catch (err) {
      console.error('[Usage] Sync error:', err);
    }
  }

  /**
   * Record AI usage (NO-OP - no counters to track)
   */
  async recordAIUsage(): Promise<void> {
    // No-op: No counters to track in new system
    console.log('[Usage] AI usage recorded (no limits)');
  }

  /**
   * Check if can use AI (delegate to subscription service)
   */
  async canUseAI(): Promise<boolean> {
    return subscriptionService.canUseAI();
  }
}

export default new UsageService();
```

**WHAT WAS REMOVED**:
- ✅ Counter sync logic (~150 lines)
- ✅ Reset date calculations (~40 lines)
- ✅ Conflict resolution (~30 lines)
- ✅ Total: ~220 lines DELETED

### Verification Checkpoint 5

```
✅ usageService.ts simplified
✅ Counter tracking removed
✅ Only tier syncing remains
✅ No TypeScript errors
✅ Ready to update billing service
```

---

## Phase 6: Code Changes - Billing Service

### Step 6.1: Remove Monthly Product from billingService.ts

**File**: `src/services/billingService.ts`

**CHANGES NEEDED**:

1. **Remove monthly product ID constant**

**FIND**:
```typescript
const PRO_MONTHLY_ID = 'monthly_pro_pass';
const PRO_MONTHLY_PLAN_ID = 'pro_monthly';
```

**DELETE** these lines completely.

2. **Remove monthly from product fetch**

**FIND**:
```typescript
const products = await Purchases.getProducts({
  skus: ['monthly_pro_pass', 'lifetime_pro_access'],
  type: PRODUCT_CATEGORY.SUBSCRIPTION,
});
```

**REPLACE WITH**:
```typescript
const products = await Purchases.getProducts({
  skus: ['lifetime_pro_access'],
  type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
});
```

3. **Remove purchasePro() method**

**FIND** and **DELETE**:
```typescript
export const purchasePro = async (): Promise<void> => {
  // ... entire method
};
```

4. **Update purchase handler to only handle lifetime**

**FIND**:
```typescript
if (purchase.productId === 'monthly_pro_pass') {
  await subscriptionService.updateTier('pro');
} else if (purchase.productId === 'lifetime_pro_access') {
  await subscriptionService.updateTier('lifetime');
}
```

**REPLACE WITH**:
```typescript
if (purchase.productId === 'lifetime_pro_access') {
  await subscriptionService.updateTier('lifetime');
}
```

5. **Update restore purchases to only restore lifetime**

**FIND**:
```typescript
for (const purchase of purchases) {
  if (purchase.productId === 'monthly_pro_pass') {
    await subscriptionService.updateTier('pro');
  } else if (purchase.productId === 'lifetime_pro_access') {
    await subscriptionService.updateTier('lifetime');
  }
}
```

**REPLACE WITH**:
```typescript
for (const purchase of purchases) {
  if (purchase.productId === 'lifetime_pro_access') {
    await subscriptionService.updateTier('lifetime');
  }
}
```

### Verification Checkpoint 6

```
✅ Monthly product references removed from billingService.ts
✅ Only lifetime product fetch remains
✅ Purchase handler simplified
✅ No TypeScript errors
✅ Ready to update UI
```

---

## Phase 7: Code Changes - Pricing Screen

### Step 7.1: Update PricingScreen.tsx to 2-Tier Layout

**File**: `src/screens/PricingScreen.tsx`

**MAJOR CHANGES**:

1. **Remove Monthly Pass Card** (around lines 200-280)

**DELETE** the entire card/section for "Pro Pass Monthly"

2. **Update layout to 2-column grid**

**FIND**:
```typescript
<View style={styles.plansContainer}>
  {/* Free tier card */}
  {/* Pro monthly card */}  ← DELETE THIS
  {/* Lifetime card */}
</View>
```

**REPLACE WITH**:
```typescript
<View style={styles.plansContainer}>
  {/* Free tier card */}
  {/* Lifetime card */}
</View>
```

3. **Update Free tier features**

```typescript
const freeFeatures = [
  { icon: '📄', text: 'All PDF Tools', included: true },
  { icon: '🔄', text: 'Merge, Split, Compress', included: true },
  { icon: '📝', text: 'Convert PDF to Image/Word', included: true },
  { icon: '🤖', text: 'AI Features', included: false },
  { icon: '💬', text: 'AI Chat & Summarize', included: false },
  { icon: '🔍', text: 'AI Text Extraction', included: false },
];
```

4. **Update Lifetime tier features**

```typescript
const lifetimeFeatures = [
  { icon: '📄', text: 'All PDF Tools', included: true },
  { icon: '🔄', text: 'Merge, Split, Compress', included: true },
  { icon: '📝', text: 'Convert PDF to Image/Word', included: true },
  { icon: '🤖', text: 'Unlimited AI Features', included: true },
  { icon: '💬', text: 'AI Chat & Summarize', included: true },
  { icon: '🔍', text: 'AI Text Extraction', included: true },
  { icon: '⚡', text: 'No Daily Limits', included: true },
  { icon: '🎯', text: 'One-Time Payment', included: true },
  { icon: '♾️', text: 'Use Forever', included: true },
];
```

5. **Update Lifetime price display**

**FIND**:
```typescript
<Text style={styles.price}>$XX.XX</Text>
```

**REPLACE WITH**:
```typescript
<Text style={styles.price}>$29.99</Text>
<Text style={styles.priceSubtext}>One-time payment</Text>
```

6. **Add "Most Popular" badge to Lifetime**

```typescript
<View style={styles.lifetimeCard}>
  <View style={styles.popularBadge}>
    <Text style={styles.popularText}>MOST POPULAR</Text>
  </View>
  {/* Rest of lifetime card */}
</View>
```

7. **Update purchase button**

**FIND**:
```typescript
<TouchableOpacity onPress={() => purchasePro()}>
```

**DELETE** (remove Pro purchase button)

**KEEP ONLY**:
```typescript
<TouchableOpacity onPress={() => purchaseLifetime()}>
  <Text>Get Lifetime Access</Text>
</TouchableOpacity>
```

### Verification Checkpoint 7

```
✅ PricingScreen shows only 2 tiers (Free, Lifetime)
✅ Lifetime price displays $29.99
✅ No Monthly/Pro option visible
✅ Layout is clean 2-column design
✅ No TypeScript errors
✅ Ready to update modals
```

---

## Phase 8: Code Changes - AI Limit Modal

### Step 8.1: Update AiLimitModal.tsx

**File**: `src/components/modals/AiLimitModal.tsx` (or similar)

**FIND**:
```typescript
<Text>You've reached your daily AI limit</Text>
<Text>Upgrade to Pro for more</Text>
<Button onPress={() => navigate('Pricing')}>View Pro Plans</Button>
```

**REPLACE WITH**:
```typescript
<Text>AI features require Lifetime tier</Text>
<Text>Get unlimited AI access forever</Text>
<Button onPress={() => navigate('Pricing')}>Unlock Lifetime - $29.99</Button>
```

**Key Changes**:
- Remove "daily limit" language (no limits exist anymore)
- Change "Pro" to "Lifetime"
- Emphasize one-time payment value

### Verification Checkpoint 8

```
✅ AI limit modal updated to promote Lifetime
✅ No mention of "Pro" or "Monthly"
✅ Clear call-to-action with price
✅ No TypeScript errors
✅ Ready to update backend
```

---

## Phase 9: Backend API Changes

### Step 9.1: Update Subscription API Endpoint

**File**: `api/user/subscription.js`

**REPLACE ENTIRE FILE WITH**:

```javascript
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken, setSecurityHeaders } from '../_utils/auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const allowedOrigins = [
  'https://pdf-tools-pro-indol.vercel.app',
  'http://localhost:5173',
  'capacitor://localhost',
];

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '');
  setSecurityHeaders(res, origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const payload = await verifySessionToken(sessionToken, supabase);

    if (!payload || !payload.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch ONLY tier from database (no counters!)
    const { data: user, error } = await supabase
      .from('user_accounts')
      .select('tier')
      .eq('google_uid', payload.uid)
      .single();

    if (error || !user) {
      return res.status(200).json({ tier: 'free' });
    }

    // Return ONLY tier (simplified response)
    return res.status(200).json({
      tier: user.tier || 'free',
    });

  } catch (err) {
    console.error('[API] Subscription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**WHAT WAS REMOVED**:
- ✅ Counter field fetches (operationsToday, aiDocsThisMonth, etc.)
- ✅ Counter field returns in response
- ✅ Reset date calculations
- ✅ ~80 lines of complexity DELETED

**WHAT REMAINS**:
- ✅ Simple tier fetch
- ✅ Simple tier return

### Verification Checkpoint 9

```
✅ API returns only tier field
✅ No counter fields in response
✅ Authentication still works
✅ CORS headers preserved
✅ Ready to update AI endpoints
```

---

## Phase 10: Backend AI Endpoint Updates

### Step 10.1: Update AI Summarize Endpoint

**File**: `api/ai/summarize.js`

**FIND**:
```javascript
// Check counters and limits
const { data: user } = await supabase
  .from('user_accounts')
  .select('tier, operations_today, ai_docs_this_month')
  .eq('google_uid', payload.uid)
  .single();

if (user.tier === 'free' && user.operations_today >= 3) {
  return res.status(403).json({ error: 'Daily limit reached' });
}

// Decrement counter
await supabase
  .from('user_accounts')
  .update({ operations_today: user.operations_today - 1 })
  .eq('google_uid', payload.uid);
```

**REPLACE WITH**:
```javascript
// Simple tier check (no counters!)
const { data: user } = await supabase
  .from('user_accounts')
  .select('tier')
  .eq('google_uid', payload.uid)
  .single();

if (!user || user.tier !== 'lifetime') {
  return res.status(403).json({
    error: 'AI features require Lifetime tier',
    tier: user?.tier || 'free'
  });
}

// No counter updates needed - just process the request
```

### Step 10.2: Update AI Chat Endpoint

**File**: `api/ai/chat.js`

**Apply same changes as Step 10.1**:
- Remove counter fetches
- Remove counter decrements
- Replace with simple `tier === 'lifetime'` check

### Step 10.3: Update AI Extract Endpoint

**File**: `api/ai/extract.js`

**Apply same changes as Step 10.1**:
- Remove counter fetches
- Remove counter decrements
- Replace with simple `tier === 'lifetime'` check

### Verification Checkpoint 10

```
✅ All AI endpoints use simple tier checking
✅ No counter decrements
✅ No limit checks
✅ Lifetime users have unlimited access
✅ Free users are blocked with clear message
✅ Ready for testing
```

---

## Phase 11: Testing

### Test 11.1: Build and Sync

```bash
cd /Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro

# Build frontend
npm run build

# Sync to Android
npx cap sync android

# Open Android Studio
npx cap open android
```

### Test 11.2: Manual Test Cases

**Test Case 1: Free User Cannot Use AI**

Steps:
1. Fresh install or clear app data
2. Do NOT purchase anything
3. Try to use AI Summarize

Expected:
- ❌ Blocked with message: "AI features require Lifetime tier"
- ✅ Shown upgrade modal
- ✅ Modal shows "Unlock Lifetime - $29.99"

**Test Case 2: Lifetime User Has Unlimited AI**

Steps:
1. Fresh install or clear app data
2. Purchase Lifetime ($29.99)
3. Use AI Summarize 10 times in a row

Expected:
- ✅ All 10 requests succeed
- ✅ No "limit reached" messages
- ✅ No counter displays in UI

**Test Case 3: Pricing Screen Shows Only 2 Tiers**

Steps:
1. Open app
2. Navigate to Pricing screen

Expected:
- ✅ Shows exactly 2 cards: Free, Lifetime
- ✅ Lifetime shows $29.99
- ✅ No Monthly/Pro option visible
- ✅ Clean 2-column layout

**Test Case 4: Purchase Restoration Works**

Steps:
1. Purchase Lifetime on Device A
2. Uninstall app
3. Install on Device B (same Google account)
4. Login with same Google account
5. Tap "Restore Purchases"

Expected:
- ✅ Tier updates to "lifetime"
- ✅ AI features immediately unlocked
- ✅ Shows "Lifetime Member" badge

**Test Case 5: Database Has No Counters**

Steps:
1. After migration, query Supabase

```sql
SELECT * FROM user_accounts LIMIT 1;
```

Expected:
- ✅ Only fields: google_uid, email, tier, created_at, updated_at
- ✅ No counter fields exist in schema

### Verification Checkpoint 11

```
✅ All 5 test cases pass
✅ No TypeScript errors
✅ No runtime errors
✅ App builds successfully
✅ Ready for deployment
```

---

## Phase 12: Deployment

### Step 12.1: Commit Changes

```bash
cd /Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro

# Stage all changes
git add .

# Check what's staged
git status

# Commit
git commit -m "Simplify to 2-tier system: Remove all counters, keep only Free + Lifetime

- Removed 7 counter columns from database
- Removed ~750 lines of counter management code
- Simplified subscriptionService to tier-only checking
- Updated PricingScreen to Free vs Lifetime layout
- Removed Pro/Monthly tier completely
- Updated all AI endpoints to simple tier checks
- Set Lifetime price to $29.99

BREAKING CHANGES:
- Database schema changed (counter columns removed)
- API responses no longer include counter fields
- Only 'free' and 'lifetime' tiers supported

Benefits:
- No more counter sync issues
- No more daily/monthly limit confusion
- Simpler codebase maintenance
- Better user experience

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 12.2: Push to Production

```bash
# Push to main branch
git push origin main
```

**Expected**:
- ✅ Vercel auto-deploys backend API changes
- ✅ Backend ready in 1-2 minutes

### Step 12.3: Build Production Android App

```bash
# Ensure latest code
git pull origin main

# Clean build
npm run build

# Sync to Android
npx cap sync android

# Open Android Studio
npx cap open android
```

**In Android Studio**:
1. Build → Clean Project
2. Build → Rebuild Project
3. Build → Generate Signed Bundle / APK
4. Upload to Google Play Console (Internal Testing or Production)

### Verification Checkpoint 12

```
✅ Code pushed to git
✅ Vercel deployed successfully
✅ Android APK built
✅ Ready for release
```

---

## Phase 13: Monitoring

### Step 13.1: Monitor Logs

**Supabase Logs**:
1. Go to Supabase Dashboard
2. Navigate: Logs → Postgres Logs
3. Watch for errors after migration

**Vercel Logs**:
1. Go to Vercel Dashboard
2. Select project: pdf-tools-pro
3. Navigate: Deployments → Latest → Functions
4. Watch for API errors

### Step 13.2: Monitor User Feedback

**Check for**:
- Pricing confusion
- Purchase failures
- AI access issues
- Counter-related bug reports (should be zero!)

### Verification Checkpoint 13

```
✅ No database errors
✅ No API errors
✅ No user complaints about counters
✅ Purchases working correctly
```

---

## Final Verification

### Complete Checklist

**Google Play Console**:
- [ ] Lifetime product price = $29.99
- [ ] Monthly subscription deactivated or hidden

**Database**:
- [ ] Counter columns removed
- [ ] Only 'free' and 'lifetime' tiers exist
- [ ] Backup created

**Code**:
- [ ] All counter logic removed (~750 lines deleted)
- [ ] subscriptionService.ts simplified (400 → 150 lines)
- [ ] usageService.ts simplified (300 → 50 lines)
- [ ] PricingScreen shows only 2 tiers
- [ ] billingService.ts has no monthly references
- [ ] All AI endpoints use simple tier checks

**Backend API**:
- [ ] subscription.js returns tier only
- [ ] AI endpoints use tier checking (no counters)
- [ ] CORS headers preserved

**Testing**:
- [ ] Free user blocked from AI ✅
- [ ] Lifetime user has unlimited AI ✅
- [ ] Pricing shows Free + Lifetime only ✅
- [ ] Purchase restoration works ✅
- [ ] Database schema clean ✅

**Deployment**:
- [ ] Code committed and pushed
- [ ] Vercel deployed
- [ ] Android APK built
- [ ] No errors in logs

---

## Rollback Plan (If Needed)

**If something goes wrong:**

### Code Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### Database Rollback

```sql
-- Drop modified table
DROP TABLE user_accounts;

-- Restore from backup
ALTER TABLE user_accounts_backup_20260201 RENAME TO user_accounts;
```

### Google Play Console Rollback

- Edit Lifetime product back to original price
- Re-activate Monthly subscription

---

## Success Criteria

**You'll know it worked when:**

1. ✅ Pricing screen shows exactly 2 tiers (Free, Lifetime $29.99)
2. ✅ Free users see "AI requires Lifetime" when trying to use AI
3. ✅ Lifetime users can use AI unlimited times with no limits
4. ✅ Database has NO counter columns
5. ✅ No TypeScript errors
6. ✅ No runtime errors
7. ✅ No user complaints about counters or sync issues

---

## Summary

**What was removed**:
- 7 counter columns from database
- ~750 lines of counter management code
- All sync complexity
- All reset date calculations
- All daily/weekly/monthly limits
- Pro/Monthly tier

**What was kept**:
- Simple tier system (Free, Lifetime)
- Google Play purchase verification
- Purchase restoration
- All PDF tools
- All AI features (for Lifetime)

**Result**:
- Maximum simplicity
- No more counter bugs
- No more sync issues
- No more user confusion
- Easy to maintain
- Clear value proposition

---

## GEMINI: Execute This Plan

**Follow these phases in order**:
1. ✅ Phase 1: Google Play Console
2. ✅ Phase 2: Database Migration
3. ✅ Phase 3-8: Code Changes
4. ✅ Phase 9-10: Backend API
5. ✅ Phase 11: Testing
6. ✅ Phase 12: Deployment
7. ✅ Phase 13: Monitoring

**Report progress after each phase.**

**Do NOT deviate from this plan.**
**Do NOT keep counter logic.**
**Do follow the full simplification approach.**

🚀 **Let's simplify this system!**
