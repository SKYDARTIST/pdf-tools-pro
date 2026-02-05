# Simplify Payment System to Two-Tier (Free + Lifetime)

## Overview

**Goal**: Simplify from 3 tiers (Free, Pro Monthly, Lifetime) to 2 tiers (Free, Lifetime $4.99)

**Why**: Reduce complexity, eliminate credit counters, focus on simple value proposition

**Timeline**: Implement now, validate with 500-1000 users, add Pro tier later if needed

---

## Part 1: Google Play Console Changes

### DO YOU NEED TO CREATE NEW PRODUCTS?

**Answer: NO!** You can edit existing products.

### Step-by-Step Console Changes

#### 1. Update Lifetime Product Price

1. Go to: https://play.google.com/console
2. Select your app: **Anti-Gravity PDF Tools Pro**
3. Navigate: **Monetize** → **Products** → **In-app products**
4. Find product: `lifetime_pro_access`
5. Click **Edit**
6. Change price: **$4.99 USD**
7. Click **Save**

**Note**: Price changes propagate in 2-4 hours globally.

---

#### 2. Handle Monthly Subscription

**Option A: Deactivate (Recommended if no active subscribers)**

1. Navigate: **Monetize** → **Products** → **Subscriptions**
2. Find: `monthly_pro_pass`
3. Click **Deactivate**
4. Confirm deactivation

**Option B: Keep Active but Hide (If you have active subscribers)**

1. Keep `monthly_pro_pass` active in Console
2. We'll hide it from app UI in the code
3. Existing subscribers can continue (ethical approach)
4. New users won't see it as an option

**Recommendation**: Use Option B to honor existing subscribers.

---

#### 3. Verify Product Configuration

After changes, verify:

```
Products Status:
- lifetime_pro_access: Active, $4.99 ✅
- monthly_pro_pass: Active (hidden) or Deactivated ✅
```

---

## Part 2: Database Schema Changes

### Current Schema (Complex - 7 counters)

```sql
-- user_accounts table
CREATE TABLE user_accounts (
    google_uid TEXT PRIMARY KEY,
    email TEXT,
    tier TEXT DEFAULT 'free',  -- Keep this ✅
    operations_today INTEGER DEFAULT 0,  -- Remove ❌
    ai_docs_this_week INTEGER DEFAULT 0,  -- Remove ❌
    ai_docs_this_month INTEGER DEFAULT 0,  -- Remove ❌
    ai_pack_credits INTEGER DEFAULT 0,  -- Remove ❌
    last_operation_reset TIMESTAMP,  -- Remove ❌
    last_ai_weekly_reset TIMESTAMP,  -- Remove ❌
    last_ai_monthly_reset TIMESTAMP,  -- Remove ❌
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### New Schema (Simple - tier only)

```sql
-- Simplified user_accounts table
CREATE TABLE user_accounts (
    google_uid TEXT PRIMARY KEY,
    email TEXT,
    tier TEXT DEFAULT 'free',  -- Only 'free' or 'lifetime'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Migration SQL

**Execute in Supabase SQL Editor:**

```sql
-- STEP 1: Backup current data (optional but recommended)
CREATE TABLE user_accounts_backup AS
SELECT * FROM user_accounts;

-- STEP 2: Remove counter columns
ALTER TABLE user_accounts
DROP COLUMN IF EXISTS operations_today,
DROP COLUMN IF EXISTS ai_docs_this_week,
DROP COLUMN IF EXISTS ai_docs_this_month,
DROP COLUMN IF EXISTS ai_pack_credits,
DROP COLUMN IF EXISTS last_operation_reset,
DROP COLUMN IF EXISTS last_ai_weekly_reset,
DROP COLUMN IF EXISTS last_ai_monthly_reset;

-- STEP 3: Normalize tier values (convert 'pro' to 'lifetime' if any)
UPDATE user_accounts
SET tier = 'lifetime'
WHERE tier = 'pro';

-- STEP 4: Verify cleanup
SELECT tier, COUNT(*) as count
FROM user_accounts
GROUP BY tier;

-- Expected result:
-- tier      | count
-- ----------+-------
-- free      | X
-- lifetime  | Y
```

**Verification Query:**

```sql
-- Check schema is clean
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_accounts'
ORDER BY ordinal_position;

-- Should show only:
-- google_uid, email, tier, created_at, updated_at
```

---

## Part 3: Code Changes

### Files to Modify

1. **src/screens/PricingScreen.tsx** - Remove Pro tier, show Free vs Lifetime
2. **src/services/billingService.ts** - Remove monthly product references
3. **src/services/subscriptionService.ts** - Remove all counter logic
4. **src/services/usageService.ts** - Simplify sync to tier-only
5. **src/types/subscription.ts** - Update interface (remove counter fields)
6. **api/user/subscription.js** - Update backend to not return counters
7. **api/ai/*.js** - Remove counter checks, use tier-only checks

---

### Detailed Implementation Steps

#### STEP 1: Update Type Definitions

**File**: `src/types/subscription.ts`

**BEFORE:**
```typescript
export interface UserSubscription {
  tier: SubscriptionTier;  // 'free' | 'pro' | 'lifetime'
  operationsToday: number;
  aiDocsThisWeek: number;
  aiDocsThisMonth: number;
  aiPackCredits: number;
  lastOperationReset: string;
  lastAiWeeklyReset: string;
  lastAiMonthlyReset: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'lifetime';
```

**AFTER:**
```typescript
export interface UserSubscription {
  tier: SubscriptionTier;  // Only 'free' or 'lifetime'
}

export type SubscriptionTier = 'free' | 'lifetime';
```

---

#### STEP 2: Update Pricing Screen (Remove Pro Tier)

**File**: `src/screens/PricingScreen.tsx`

**Current Structure**: 3 cards (Free, Pro Monthly, Lifetime)

**New Structure**: 2 cards (Free, Lifetime)

**Changes Required:**

1. **Remove Monthly Pass Card** (lines ~200-280)
   - Delete the entire Monthly Pass section
   - Remove `monthly_pro_pass` from product fetch

2. **Update Layout** (lines ~150-400)
   - Change from 3-column to 2-column layout
   - Center the two cards

3. **Update Lifetime Card**
   - Change price display to **$4.99**
   - Update features list to emphasize "Ultimate" tier
   - Add "Most Popular" badge

4. **Update Features Comparison**

**Free Tier Features:**
```typescript
const freeFeatures = [
  { icon: '📄', text: 'All PDF Tools', available: true },
  { icon: '🔄', text: 'Merge, Split, Compress', available: true },
  { icon: '📝', text: 'PDF to Image/Word', available: true },
  { icon: '🤖', text: 'AI Features', available: false },
  { icon: '💬', text: 'AI Chat & Summarize', available: false },
  { icon: '🔍', text: 'AI Text Extraction', available: false },
];
```

**Lifetime Tier Features:**
```typescript
const lifetimeFeatures = [
  { icon: '📄', text: 'All PDF Tools', available: true },
  { icon: '🔄', text: 'Merge, Split, Compress', available: true },
  { icon: '📝', text: 'PDF to Image/Word', available: true },
  { icon: '🤖', text: 'Unlimited AI Features', available: true },
  { icon: '💬', text: 'AI Chat & Summarize', available: true },
  { icon: '🔍', text: 'AI Text Extraction', available: true },
  { icon: '⚡', text: 'No Daily Limits', available: true },
  { icon: '🎯', text: 'One-Time Payment', available: true },
];
```

5. **Remove Product Fetch for Monthly**

**BEFORE:**
```typescript
const products = await Purchases.getProducts({
  skus: ['monthly_pro_pass', 'lifetime_pro_access'],
  type: PRODUCT_CATEGORY.SUBSCRIPTION,
});
```

**AFTER:**
```typescript
const products = await Purchases.getProducts({
  skus: ['lifetime_pro_access'],
  type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
});
```

---

#### STEP 3: Update Billing Service

**File**: `src/services/billingService.ts`

**Changes:**

1. **Remove Monthly Product References** (line ~80-120)
   - Remove `monthly_pro_pass` from product lists
   - Remove monthly-specific handlers

2. **Simplify Purchase Flow** (line ~200-300)
   - Only handle lifetime purchases
   - Remove tier selection logic (only 'lifetime' available)

3. **Update Restore Purchases** (line ~500-600)
   - Remove monthly subscription restoration
   - Only restore lifetime purchases

**Key Function Changes:**

**BEFORE:**
```typescript
export const fetchProducts = async (): Promise<ProductOffering[]> => {
  const offerings = await Purchases.getOfferings();
  return [
    offerings.current?.monthly_pro_pass,
    offerings.current?.lifetime_pro_access,
  ].filter(Boolean);
};
```

**AFTER:**
```typescript
export const fetchProducts = async (): Promise<ProductOffering[]> => {
  const offerings = await Purchases.getOfferings();
  return [
    offerings.current?.lifetime_pro_access,
  ].filter(Boolean);
};
```

---

#### STEP 4: Simplify Subscription Service (Remove Counters)

**File**: `src/services/subscriptionService.ts`

**Current State**: 400+ lines with counter management

**New State**: ~100 lines with tier-only checks

**Complete Rewrite:**

```typescript
import { supabase } from '../config/supabaseClient';
import { UserSubscription, SubscriptionTier } from '../types/subscription';

class SubscriptionService {
  private currentSubscription: UserSubscription | null = null;

  /**
   * Get user's current subscription tier
   */
  async getSubscription(): Promise<UserSubscription> {
    if (this.currentSubscription) {
      return this.currentSubscription;
    }

    // Fetch from server
    const tier = await this.fetchTierFromServer();
    this.currentSubscription = { tier };
    return this.currentSubscription;
  }

  /**
   * Fetch tier from Supabase
   */
  private async fetchTierFromServer(): Promise<SubscriptionTier> {
    try {
      const googleUid = await this.getGoogleUid();
      if (!googleUid) return 'free';

      const { data, error } = await supabase
        .from('user_accounts')
        .select('tier')
        .eq('google_uid', googleUid)
        .single();

      if (error || !data) return 'free';
      return data.tier as SubscriptionTier;
    } catch (err) {
      console.error('[Subscription] Fetch error:', err);
      return 'free';
    }
  }

  /**
   * Check if user can use AI features
   */
  async canUseAI(): Promise<boolean> {
    const subscription = await this.getSubscription();
    return subscription.tier === 'lifetime';
  }

  /**
   * Update tier after purchase
   */
  async updateTier(newTier: SubscriptionTier): Promise<void> {
    try {
      const googleUid = await this.getGoogleUid();
      if (!googleUid) throw new Error('No Google UID');

      await supabase
        .from('user_accounts')
        .upsert({
          google_uid: googleUid,
          tier: newTier,
          updated_at: new Date().toISOString(),
        });

      this.currentSubscription = { tier: newTier };
    } catch (err) {
      console.error('[Subscription] Update error:', err);
      throw err;
    }
  }

  /**
   * Reset cached subscription (call on login/logout)
   */
  reset(): void {
    this.currentSubscription = null;
  }

  /**
   * Get Google UID from auth service
   */
  private async getGoogleUid(): Promise<string | null> {
    // Implementation depends on your auth service
    // Return current user's Google UID
    return null; // Placeholder
  }
}

export default new SubscriptionService();
```

**What was removed:**
- ✅ All counter increment/decrement logic (~100 lines)
- ✅ All reset timestamp checking (~50 lines)
- ✅ All sync-to-server counter logic (~80 lines)
- ✅ All daily/weekly/monthly limit checks (~60 lines)

**What remains:**
- ✅ Simple tier fetching
- ✅ Simple tier updating
- ✅ Simple permission checking (tier === 'lifetime')

---

#### STEP 5: Update Usage Service (Remove Sync Logic)

**File**: `src/services/usageService.ts`

**BEFORE**: Complex sync with 7 fields

**AFTER**: Simple tier sync

```typescript
import { supabase } from '../config/supabaseClient';
import subscriptionService from './subscriptionService';

class UsageService {
  /**
   * Sync tier from server (call on app startup)
   */
  async syncFromServer(): Promise<void> {
    try {
      await subscriptionService.getSubscription(); // Fetches and caches tier
      console.log('[Usage] Tier synced from server');
    } catch (err) {
      console.error('[Usage] Sync error:', err);
    }
  }

  /**
   * Update tier on server (call after purchase)
   */
  async updateTierOnServer(tier: 'free' | 'lifetime'): Promise<void> {
    try {
      await subscriptionService.updateTier(tier);
      console.log('[Usage] Tier updated on server:', tier);
    } catch (err) {
      console.error('[Usage] Update error:', err);
      throw err;
    }
  }
}

export default new UsageService();
```

**What was removed:**
- ✅ Counter sync logic (~150 lines)
- ✅ Reset date calculations (~40 lines)
- ✅ Conflict resolution (~30 lines)

---

#### STEP 6: Update Backend API (Remove Counter Returns)

**File**: `api/user/subscription.js`

**BEFORE**: Returns all counters

**AFTER**: Returns tier only

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

    // Fetch tier from database
    const { data: user, error } = await supabase
      .from('user_accounts')
      .select('tier')
      .eq('google_uid', payload.uid)
      .single();

    if (error || !user) {
      return res.status(200).json({ tier: 'free' });
    }

    // Return only tier (no counters!)
    return res.status(200).json({
      tier: user.tier || 'free',
    });

  } catch (err) {
    console.error('[API] Subscription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**What was removed:**
- ✅ Counter field fetches
- ✅ Counter field returns
- ✅ Reset date calculations

---

#### STEP 7: Update AI Endpoint Permissions

**Files**: `api/ai/summarize.js`, `api/ai/chat.js`, `api/ai/extract.js`

**BEFORE**: Complex counter checks

**AFTER**: Simple tier check

**Example for `api/ai/summarize.js`:**

```javascript
export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '');
  setSecurityHeaders(res, origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const payload = await verifySessionToken(sessionToken, supabase);

    if (!payload || !payload.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // SIMPLE PERMISSION CHECK (replaces complex counter logic)
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

    // Process AI request (no counter updates!)
    const { text } = req.body;
    const summary = await generateSummary(text);

    return res.status(200).json({ summary });

  } catch (err) {
    console.error('[AI] Summarize error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**Key Changes:**
- ✅ Removed counter fetches
- ✅ Removed counter decrements
- ✅ Removed reset date checks
- ✅ Simple tier check: `tier === 'lifetime'`

**Apply same pattern to:**
- `api/ai/chat.js`
- `api/ai/extract.js`
- Any other AI endpoints

---

## Part 4: UI Updates

### Update Feature Gates

**Files**: Any component that checks permissions

**BEFORE:**
```typescript
if (subscription.aiDocsThisMonth >= 10) {
  showUpgradePrompt('Monthly AI limit reached');
  return;
}
```

**AFTER:**
```typescript
if (subscription.tier !== 'lifetime') {
  showUpgradePrompt('AI features require Lifetime tier');
  return;
}
```

---

### Update Subscription Display

**Example**: Settings screen, profile screen

**BEFORE:**
```typescript
<Text>Tier: {tier}</Text>
<Text>AI Docs This Month: {aiDocsThisMonth}/10</Text>
<Text>Operations Today: {operationsToday}/20</Text>
```

**AFTER:**
```typescript
<Text>Tier: {tier === 'lifetime' ? 'Lifetime Member' : 'Free'}</Text>
{tier === 'free' && (
  <TouchableOpacity onPress={navigateToPricing}>
    <Text>Upgrade to Lifetime for $4.99</Text>
  </TouchableOpacity>
)}
```

---

## Part 5: Testing Plan

### Test Case 1: Free User Cannot Use AI

**Steps:**
1. Fresh install
2. Do NOT purchase
3. Try to use AI Summarize

**Expected:**
- ❌ Blocked with message: "AI features require Lifetime tier"
- ✅ Shown upgrade prompt
- ✅ Clicking upgrade opens pricing screen

---

### Test Case 2: Lifetime User Has Unlimited AI

**Steps:**
1. Fresh install
2. Purchase Lifetime ($4.99)
3. Use AI Summarize 20 times

**Expected:**
- ✅ All 20 requests succeed
- ✅ No counter limits
- ✅ No "limit reached" messages

---

### Test Case 3: Purchase Restoration Works

**Steps:**
1. Purchase Lifetime on Device A
2. Uninstall app
3. Install on Device B
4. Login with same Google account
5. Click "Restore Purchases"

**Expected:**
- ✅ Tier updates to "lifetime"
- ✅ AI features unlocked
- ✅ Shows "Lifetime Member" badge

---

### Test Case 4: Pricing Screen Shows Only 2 Tiers

**Steps:**
1. Open app
2. Navigate to Pricing

**Expected:**
- ✅ Shows 2 cards: Free, Lifetime
- ✅ Lifetime shows $4.99
- ✅ No Monthly/Pro option visible

---

### Test Case 5: Database Has No Counters

**Steps:**
1. After migration, query database

```sql
SELECT * FROM user_accounts LIMIT 1;
```

**Expected:**
- ✅ Only fields: google_uid, email, tier, created_at, updated_at
- ✅ No counter fields exist

---

## Part 6: Deployment Checklist

### Pre-Deployment

- [ ] Backup Supabase database
- [ ] Test on local environment
- [ ] Verify all counter references removed from code
- [ ] Verify tier checks work correctly
- [ ] Update Google Play Console pricing

### Deployment Steps

1. **Push code changes to production**
   ```bash
   git add .
   git commit -m "Simplify to 2-tier system (Free + Lifetime $4.99)"
   git push origin main
   ```

2. **Run database migration**
   - Execute migration SQL in Supabase
   - Verify counter columns removed

3. **Deploy Vercel backend**
   - Vercel auto-deploys on git push
   - Verify deployment successful

4. **Build and release Android app**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   # Build APK/AAB in Android Studio
   # Upload to Google Play Console
   ```

5. **Monitor for errors**
   - Check Supabase logs
   - Check Vercel function logs
   - Check app crash reports

---

## Part 7: Rollback Plan

**If something goes wrong:**

### Code Rollback
```bash
git revert HEAD
git push origin main
```

### Database Rollback
```sql
-- Restore from backup
DROP TABLE user_accounts;
ALTER TABLE user_accounts_backup RENAME TO user_accounts;
```

### Google Play Console Rollback
- Change Lifetime price back to original
- Re-activate Monthly subscription

---

## Part 8: Post-Launch Monitoring

### Metrics to Track

1. **Conversion Rate**
   - Free → Lifetime conversion %
   - Target: >5% after 500 users

2. **User Feedback**
   - Are users confused about pricing?
   - Do they want a monthly option?

3. **Revenue**
   - Total revenue from Lifetime purchases
   - Compare to previous 3-tier model

4. **Support Tickets**
   - Pricing-related questions
   - Counter/limit confusion (should drop to 0)

---

## Summary

### What Changes

**Google Play Console:**
- ✅ Update Lifetime to $4.99
- ✅ Deactivate or hide Monthly Pass

**Database:**
- ✅ Remove 7 counter columns
- ✅ Keep only `tier` field

**Code:**
- ✅ Remove 500+ lines of counter logic
- ✅ Simplify to tier-only checks
- ✅ Update Pricing Screen to 2 tiers
- ✅ Remove Monthly product references

**User Experience:**
- ✅ Simpler pricing page (2 options)
- ✅ No confusing counters
- ✅ Clear value: Free tools vs Lifetime AI
- ✅ One-time payment, own forever

### What Stays Same

- ✅ Google Play purchase verification
- ✅ Purchase restoration flow
- ✅ Authentication system
- ✅ PDF tools functionality
- ✅ AI features functionality

---

## Questions & Answers

**Q: Can we change payment system again later?**
**A:** Yes! You can always:
- Add a Monthly Pro tier later
- Adjust Lifetime price
- Add new products in Google Play Console
- No need to recreate products

**Q: What if we want to add Pro tier after 1000 users?**
**A:** Easy! Just:
- Add `'pro'` to SubscriptionTier type
- Add tier checks for Pro features
- Add Monthly product back to Console
- Update Pricing Screen to show 3 tiers

**Q: Will existing Lifetime users be affected?**
**A:** No, they keep their access regardless of price changes.

---

## Ready to Execute?

**Gemini**: Follow this guide step-by-step. Report progress after each major section:
1. ✅ Google Play Console updated
2. ✅ Database migrated
3. ✅ Code updated and tested locally
4. ✅ Deployed to production
5. ✅ Tested on live app

**Let's simplify this system! 🚀**
