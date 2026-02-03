-- Anti-Gravity Production Security Lockdown v6.4
-- Goal: Reach "Zero-Trust" Client-Side Architecture

-- 1. Tighten tier_changes RLS
-- Your screenshot showed "Users can view own tier history" (SELECT for public).
-- Since the frontend doesn't use this, we lock it down to Service Role only.
DROP POLICY IF EXISTS "Users can view own tier history" ON tier_changes;
DROP POLICY IF EXISTS "Service role only access" ON tier_changes;

CREATE POLICY "Service role only access" ON tier_changes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Audit and Enforce user_accounts RLS
-- Ensure NO public access. Even if it says "no data", let's be explicit.
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view accounts" ON user_accounts; -- Delete legacy permissive policies
DROP POLICY IF EXISTS "Service role only access" ON user_accounts;

CREATE POLICY "Service role only access" ON user_accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Audit and Enforce ag_user_usage RLS
-- Ensure the v6.2 policy is correctly in place
ALTER TABLE ag_user_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Unified secure usage policy" ON ag_user_usage;
DROP POLICY IF EXISTS "Service role only access" ON ag_user_usage;

CREATE POLICY "Service role only access" ON ag_user_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Audit and Enforce purchase_transactions RLS
-- Backend only storage
ALTER TABLE purchase_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access" ON purchase_transactions;

CREATE POLICY "Service role only access" ON purchase_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- SUMMARY:
-- 100% of tables are now locked to 'service_role' (Backend Only).
-- Frontend keys (anon) can no longer READ or WRITE to any data directly.
-- All data integrity is now authoritatively managed by api/index.js.
