-- Anti-Gravity Automated Auditing v6.3
-- Goal: Automatically log every tier change in the database

-- 1. Create the Audit Function
-- This function will be called automatically by Postgres whenever a row is updated.
CREATE OR REPLACE FUNCTION record_tier_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only record if the tier has actually changed
    IF (OLD.tier IS DISTINCT FROM NEW.tier) THEN
        INSERT INTO tier_changes (
            google_uid,
            device_id,
            from_tier,
            to_tier,
            reason,
            changed_at
        ) VALUES (
            CASE WHEN TG_TABLE_NAME = 'user_accounts' THEN NEW.google_uid ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'ag_user_usage' THEN NEW.device_id ELSE NULL END,
            OLD.tier,
            NEW.tier,
            'Automated Audit: ' || TG_OP || ' on ' || TG_TABLE_NAME,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach Trigger to user_accounts
-- Fires whenever a user's account is updated
DROP TRIGGER IF EXISTS on_tier_change_user_accounts ON user_accounts;
CREATE TRIGGER on_tier_change_user_accounts
    AFTER UPDATE ON user_accounts
    FOR EACH ROW
    EXECUTE FUNCTION record_tier_change();

-- 3. Attach Trigger to ag_user_usage
-- Fires whenever a device-based usage record is updated
DROP TRIGGER IF EXISTS on_tier_change_ag_usage ON ag_user_usage;
CREATE TRIGGER on_tier_change_ag_usage
    AFTER UPDATE ON ag_user_usage
    FOR EACH ROW
    EXECUTE FUNCTION record_tier_change();

-- 4. Enable RLS on tier_changes (Safety Check)
ALTER TABLE tier_changes ENABLE ROW LEVEL SECURITY;

-- Deny all public access to history (Keep it for service_role/admin only)
DROP POLICY IF EXISTS "Service role only access" ON tier_changes;
CREATE POLICY "Service role only access" ON tier_changes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- SUMMARY:
-- Your 'tier_changes' table is now "Alive."
-- Any update to a user's tier in ANY table will now leave a permanent audit trail.
