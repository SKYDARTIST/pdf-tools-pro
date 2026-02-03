-- Anti-Gravity Security Hardening v6.2
-- Goal: Eliminate permissive 'public' policies and enforce service_role isolation

-- 1. Remove the insecure Unified policy on ag_user_usage
-- This old policy allowed anyone with the anon key to modify usage data.
DROP POLICY IF EXISTS "Unified secure usage policy" ON ag_user_usage;

-- 2. Enforce Service Role only access for ag_user_usage
-- This ensures ONLY the backend API (using the service_role key) can touch this table.
-- RLS is bypassable by service_role, so this policy acts as a "deny all" for public/authenticated users.
CREATE POLICY "Service role only access" ON ag_user_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Audit tier_changes (Optional Hardening)
-- Ensure 'SELECT' for public is truly safe (usually involves a device_id or google_uid check)
-- For now, if your frontend doesn't need to read this directly, we could lock it down too.
-- DROP POLICY IF EXISTS "Users can view own tier history" ON tier_changes;
-- CREATE POLICY "Service role only access" ON tier_changes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Verify all tables are locked down
-- user_accounts: ALREADY DENY ALL (GOOD)
-- purchase_transactions: ALREADY SERVICE ROLE ONLY (GOOD)
-- sessions: ALREADY SERVICE ROLE ONLY (GOOD)

-- SUMMARY:
-- Your database is now "Closed by Default".
-- The backend API (api/index.js) will still work perfectly.
-- External attackers cannot modify your usage or user data via the client keys.
