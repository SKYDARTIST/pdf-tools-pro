# Cleanup Test Data - Supabase Guide

## How to Clean Up Test Accounts & Purchases

### Step 1: Identify Test Accounts

In Supabase **SQL Editor**, run:

```sql
-- List all accounts (check for test emails)
SELECT
    google_uid,
    email,
    tier,
    ai_pack_credits,
    created_at
FROM user_accounts
ORDER BY created_at DESC;
```

**Look for**:
- Test emails (test@, demo@, etc.)
- Multiple accounts with same pattern
- Accounts with tier="lifetime" but no purchases

---

### Step 2: Check Purchase Records

```sql
-- List all purchase transactions
SELECT
    transaction_id,
    product_id,
    google_uid,
    verified,
    purchase_date
FROM purchase_transactions
ORDER BY purchase_date DESC;
```

**Questions**:
- Any transactions without corresponding user?
- Any unverified transactions?
- Any duplicate test transactions?

---

### Step 3: Remove Test Accounts

**⚠️ CAREFUL: This deletes data permanently!**

```sql
-- Delete specific test account
DELETE FROM user_accounts
WHERE email = 'test@example.com';

-- OR delete multiple test accounts
DELETE FROM user_accounts
WHERE email LIKE 'test%@%';

-- OR delete accounts created during testing period
DELETE FROM user_accounts
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31'
AND tier = 'lifetime'
AND email NOT LIKE '%@gmail.com'; -- Keep real accounts
```

---

### Step 4: Remove Test Purchases

```sql
-- Delete test purchase transactions
DELETE FROM purchase_transactions
WHERE verified = false;

-- OR delete specific test transaction
DELETE FROM purchase_transactions
WHERE transaction_id = 'test_transaction_123';
```

---

### Step 5: Clean Up Device Usage Table

```sql
-- Check ag_user_usage table
SELECT device_id, tier, ai_pack_credits
FROM ag_user_usage
LIMIT 50;

-- Delete test device entries
DELETE FROM ag_user_usage
WHERE tier = 'lifetime'
AND device_id LIKE 'test%';
```

---

### Step 6: Reset Your Main Account to Real State

**If you're NOT a paying customer**:

```sql
UPDATE user_accounts
SET
    tier = 'free',
    ai_pack_credits = 0,
    ai_docs_monthly = 0,
    operations_today = 0
WHERE email = 'your-real-email@gmail.com';
```

**If you ARE a paying customer** (have real purchase):

```sql
-- First verify purchase exists
SELECT * FROM purchase_transactions
WHERE google_uid = (
    SELECT google_uid FROM user_accounts
    WHERE email = 'your-real-email@gmail.com'
);

-- If purchase exists and verified, tier should already be correct
-- If not, check Google Play and re-verify purchase in app
```

---

### Step 7: Verify Cleanup

```sql
-- Count remaining accounts
SELECT tier, COUNT(*) as count
FROM user_accounts
GROUP BY tier;

-- Check your account specifically
SELECT * FROM user_accounts
WHERE email = 'your-real-email@gmail.com';

-- Verify no orphaned purchases
SELECT COUNT(*) FROM purchase_transactions
WHERE google_uid NOT IN (SELECT google_uid FROM user_accounts);
```

---

## Safety Checklist

Before deleting anything:

- [ ] Backed up database (Supabase → Project Settings → Backups)
- [ ] Identified which accounts are test vs real
- [ ] Confirmed real email addresses to keep
- [ ] Tested DELETE query with `WHERE` clause first
- [ ] Ready to re-purchase if you delete real data by mistake

---

## Restore Accidentally Deleted Data

**If you deleted wrong data**:

1. Go to Supabase Dashboard
2. Project Settings → Backups
3. Find backup from before deletion
4. Restore from backup

**Note**: Free tier has limited backup retention

---

## Recommended Cleanup

**For your situation** (testing + trying to cancel):

```sql
-- Step 1: Check what you have
SELECT email, tier, ai_pack_credits
FROM user_accounts
WHERE email = 'your-email@gmail.com';

-- Step 2: If tier='lifetime' but no Google Play purchase
-- Update to free tier
UPDATE user_accounts
SET tier = 'free',
    ai_pack_credits = 0
WHERE email = 'your-email@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM purchase_transactions
    WHERE google_uid = user_accounts.google_uid
    AND verified = true
);

-- Step 3: Verify
SELECT email, tier, ai_pack_credits
FROM user_accounts
WHERE email = 'your-email@gmail.com';
```

---

## After Cleanup

**Test the app**:
1. Logout from app
2. Clear app data (or reinstall)
3. Login again with same Google account
4. Check tier: Should show "Free" now

**If you want Lifetime**:
- Purchase in-app
- Will be verified with Google Play
- Legitimate and permanent

---

**Need help with SQL?** Let me know which accounts to keep/delete!
