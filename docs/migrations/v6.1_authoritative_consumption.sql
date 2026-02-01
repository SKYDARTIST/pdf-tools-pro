-- Migration: Authoritative AI Credit Consumption
-- Prevents race conditions and ensures authoritative decrement/increment

CREATE OR REPLACE FUNCTION consume_ai_credit(
    p_google_uid TEXT DEFAULT NULL,
    p_device_id TEXT DEFAULT NULL
) RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    IF p_google_uid IS NOT NULL THEN
        -- Priority 1: Google Account
        SELECT ai_pack_credits INTO v_credits FROM user_accounts WHERE google_uid = p_google_uid FOR UPDATE;
        
        IF v_credits > 0 THEN
            UPDATE user_accounts SET ai_pack_credits = v_credits - 1, updated_at = NOW() WHERE google_uid = p_google_uid;
        ELSE
            UPDATE user_accounts SET ai_docs_monthly = COALESCE(ai_docs_monthly, 0) + 1, ai_docs_weekly = COALESCE(ai_docs_weekly, 0) + 1, updated_at = NOW() WHERE google_uid = p_google_uid;
        END IF;
    ELSIF p_device_id IS NOT NULL THEN
        -- Priority 2: Device ID
        SELECT ai_pack_credits INTO v_credits FROM ag_user_usage WHERE device_id = p_device_id FOR UPDATE;

        IF v_credits > 0 THEN
            UPDATE ag_user_usage SET ai_pack_credits = v_credits - 1, updated_at = NOW() WHERE device_id = p_device_id;
        ELSE
            UPDATE ag_user_usage SET ai_docs_monthly = COALESCE(ai_docs_monthly, 0) + 1, ai_docs_weekly = COALESCE(ai_docs_weekly, 0) + 1, updated_at = NOW() WHERE device_id = p_device_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
