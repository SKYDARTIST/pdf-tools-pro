# Check Your Database Tier Status

## How to Check What's Actually in Supabase

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/
2. Login with your account
3. Select project: **pdf-tools-pro** (or your project name)

---

### Step 2: Check user_accounts Table

1. Click **Table Editor** (left sidebar)
2. Select table: **user_accounts**
3. Find your row:
   - Search by your email
   - OR search by Google UID

**Look at these columns**:

| Column | What to Check |
|--------|---------------|
| `google_uid` | Your Google account ID |
| `email` | Your email address |
| **`tier`** | **← CHECK THIS!** |
| `ai_pack_credits` | Current credits |
| `purchase_transactions` | Any purchase records? |

---

### Step 3: Check Tier Value

**Your `tier` column shows**: ___________

**Possible values**:
- `"free"` - Free tier
- `"pro"` - Pro subscription
- `"lifetime"` - Lifetime (what you're seeing)

---

### Step 4: Check purchase_transactions Table

1. In Table Editor, select: **purchase_transactions**
2. Filter by your Google UID or email

**Questions**:
- Any rows showing Lifetime purchase? (Yes/No)
- If yes, what's the `transaction_id`?
- If yes, what's the `product_id`?
- If yes, is `verified` = true?

---

### Step 5: Determine If Real or Manual

**If Real Google Play Purchase**:
- ✅ Row exists in `purchase_transactions`
- ✅ `verified` = true
- ✅ `transaction_id` present
- ✅ `product_id` = "lifetime_pro_access" or similar

**If Manual Database Entry**:
- ❌ No row in `purchase_transactions`
- ❌ OR `verified` = false
- ❌ tier = "lifetime" but no proof of purchase

---

## What Each Scenario Means

### Scenario A: Real Purchase (Verified)

**Evidence**:
- Row in `purchase_transactions` with `verified: true`
- Transaction ID from Google Play
- Purchase date visible

**What this means**:
- ✅ You DID purchase it from Google Play
- ✅ It WAS verified with Google's servers
- ✅ You might have refunded/cancelled later (Google allows 48hr refunds)
- ✅ Database wasn't updated when you cancelled

**Action**:
- Check Google Play purchase history for refunds
- If refunded, you should update database to `tier: "free"`

---

### Scenario B: Manual Test Entry

**Evidence**:
- No row in `purchase_transactions`
- OR `verified: false` or `verified: null`
- tier = "lifetime" but no purchase proof

**What this means**:
- ⚠️ You (or someone) manually set tier to "lifetime" in Supabase
- ⚠️ No real Google Play purchase
- ⚠️ App is just reading what's in the database

**Action**:
- If you want to keep testing: Leave it
- If you want real state: Update to `tier: "free"`

---

### Scenario C: Cancelled/Refunded Purchase

**Evidence**:
- Row in `purchase_transactions` exists
- But tier = "lifetime" still (not updated)
- Google Play shows refund/cancellation

**What this means**:
- 💰 You purchased, then cancelled/refunded
- 🐛 Database wasn't updated when you cancelled
- 🎁 You're getting Lifetime for free (bug in your favor!)

**Ethical action**:
- Update database to reflect real status
- OR re-purchase if you want Lifetime

---

## How to Update Your Tier (If Needed)

### Option 1: Via Supabase Dashboard (Manual)

1. Go to **Table Editor** → **user_accounts**
2. Find your row
3. Double-click `tier` column
4. Change to: `"free"` (or whatever is correct)
5. Click **Save**

---

### Option 2: Via SQL Query

In Supabase **SQL Editor**:

```sql
-- Check current tier
SELECT google_uid, email, tier, ai_pack_credits
FROM user_accounts
WHERE email = 'your-email@gmail.com';

-- Update to free tier (if that's correct)
UPDATE user_accounts
SET tier = 'free'
WHERE email = 'your-email@gmail.com';

-- Verify update
SELECT google_uid, email, tier
FROM user_accounts
WHERE email = 'your-email@gmail.com';
```

---

## Summary

**Your Lifetime status is coming from the database**, not Google Play.

**To know if it's legitimate**:
1. Check `purchase_transactions` table
2. Check Google Play purchase history
3. Compare the two

**If no matching purchase** → It's a manual/test entry

**If real purchase** → You might have cancelled but database wasn't updated

---

**What do you want to do**:
- Keep Lifetime for testing? → Leave it
- Set to real status? → Update database
- Buy real Lifetime? → Make purchase in app

Your choice! 🎯
