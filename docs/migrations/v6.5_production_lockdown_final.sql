-- Anti-Gravity Production Security Lockdown v6.5 (Idempotent)
-- Goal: Reach "Zero-Trust" Client-Side Architecture
-- This script is safe to run multiple times.

-- ==========================================
-- 1. Table: ag_user_usage
-- ==========================================
ALTER TABLE ag_user_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Unified secure usage policy" ON ag_user_usage;
DROP POLICY IF EXISTS "Service role only access" ON ag_user_usage;

CREATE POLICY "Service role only access" ON ag_user_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 2. Table: user_accounts
-- ==========================================
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view accounts" ON user_accounts;
DROP POLICY IF EXISTS "Service role only access" ON user_accounts;

CREATE POLICY "Service role only access" ON user_accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 3. Table: tier_changes
-- ==========================================
ALTER TABLE tier_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tier history" ON tier_changes;
DROP POLICY IF EXISTS "Service role only access" ON tier_changes;

CREATE POLICY "Service role only access" ON tier_changes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 4. Table: purchase_transactions
-- ==========================================
ALTER TABLE purchase_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access" ON purchase_transactions;

CREATE POLICY "Service role only access" ON purchase_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 5. Table: sessions
-- ==========================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service Role Only" ON sessions;
DROP POLICY IF EXISTS "Service role only access" ON sessions;

CREATE POLICY "Service role only access" ON sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- SUMMARY:
-- All tables are now explicitly locked to 'service_role'.
-- If a policy already existed, it was dropped and recreated.
-- Secure by default.
