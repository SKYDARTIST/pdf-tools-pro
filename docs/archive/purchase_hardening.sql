-- 1. Create purchase_transactions table for deduplication and audit trail
CREATE TABLE IF NOT EXISTS purchase_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT UNIQUE NOT NULL, -- Google Play / App Store Transaction ID
    device_id TEXT NOT NULL,
    google_uid TEXT, -- Nullable if guest purchase
    product_id TEXT NOT NULL,
    purchase_token TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_response JSONB -- Store the full response from Google/Apple for debugging
);

-- 2. Enable RLS and set restrictive policies
ALTER TABLE purchase_transactions ENABLE ROW LEVEL SECURITY;

-- Only service_role can do anything (Backend only)
-- Note: service_role usually bypasses RLS, but we keep it enabled for dashboard compliance
DROP POLICY IF EXISTS "Service role only access" ON purchase_transactions;
CREATE POLICY "Service role only access" ON purchase_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Create index for fast deduplication checks
CREATE INDEX IF NOT EXISTS idx_purchase_transactions_tid ON purchase_transactions(transaction_id);

-- 4. Create RPC for atomic credit increments
-- Usage: supabase.rpc('increment_ai_credits', { p_device_id: '...', p_google_uid: '...', p_amount: 100 })
CREATE OR REPLACE FUNCTION increment_ai_credits(
    p_device_id TEXT,
    p_google_uid TEXT DEFAULT NULL,
    p_amount INTEGER DEFAULT 100
) RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- SECURITY (V4): Validate amount to prevent overflow or abuse
    IF p_amount <= 0 OR p_amount > 1000 THEN
        RAISE EXCEPTION 'Invalid credit amount: %', p_amount;
    END IF;

    -- Update device-based usage
    UPDATE ag_user_usage 
    SET ai_pack_credits = COALESCE(ai_pack_credits, 0) + p_amount,
        updated_at = NOW()
    WHERE device_id = p_device_id;

    -- Update Google account usage if provided
    IF p_google_uid IS NOT NULL THEN
        UPDATE user_accounts 
        SET ai_pack_credits = COALESCE(ai_pack_credits, 0) + p_amount,
            updated_at = NOW()
        WHERE google_uid = p_google_uid;
    END IF;
END;
$$ LANGUAGE plpgsql;
