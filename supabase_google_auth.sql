-- Create user_accounts table (replaces device-based ag_user_usage)
CREATE TABLE IF NOT EXISTS user_accounts (
  google_uid TEXT PRIMARY KEY,
  email TEXT NOT NULL
);

-- SAFE MIGRATION: Add missing columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='name') THEN
        ALTER TABLE user_accounts ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='picture') THEN
        ALTER TABLE user_accounts ADD COLUMN picture TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='tier') THEN
        ALTER TABLE user_accounts ADD COLUMN tier TEXT NOT NULL DEFAULT 'FREE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='ai_pack_credits') THEN
        ALTER TABLE user_accounts ADD COLUMN ai_pack_credits INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='operations_today') THEN
        ALTER TABLE user_accounts ADD COLUMN operations_today INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='ai_docs_weekly') THEN
        ALTER TABLE user_accounts ADD COLUMN ai_docs_weekly INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='ai_docs_monthly') THEN
        ALTER TABLE user_accounts ADD COLUMN ai_docs_monthly INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='last_operation_reset') THEN
        ALTER TABLE user_accounts ADD COLUMN last_operation_reset TIMESTAMP DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='last_ai_weekly_reset') THEN
        ALTER TABLE user_accounts ADD COLUMN last_ai_weekly_reset TIMESTAMP DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='last_ai_monthly_reset') THEN
        ALTER TABLE user_accounts ADD COLUMN last_ai_monthly_reset TIMESTAMP DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='trial_start_date') THEN
        ALTER TABLE user_accounts ADD COLUMN trial_start_date TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='has_received_bonus') THEN
        ALTER TABLE user_accounts ADD COLUMN has_received_bonus BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='purchase_token') THEN
        ALTER TABLE user_accounts ADD COLUMN purchase_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='created_at') THEN
        ALTER TABLE user_accounts ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='last_login') THEN
        ALTER TABLE user_accounts ADD COLUMN last_login TIMESTAMP DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_accounts' AND column_name='updated_at') THEN
        ALTER TABLE user_accounts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_tier ON user_accounts(tier);

-- FINAL PRODUCTION RLS: Unified Profile Access
-- This script replaces all previous conflicting policies to remove dashboard warnings.

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- 1. DROP ALL PREVIOUS POLICIES (Cleanup conflict warnings)
DROP POLICY IF EXISTS "Users can view their own data" ON user_accounts;
DROP POLICY IF EXISTS "Users can update their own data" ON user_accounts;
DROP POLICY IF EXISTS "Allow public profile view" ON user_accounts;

-- 2. SECURE ACCESS POLICY (v3.1)
-- REMOVED: "Unified Profile Selection" which used USING (true) - THIS WAS A DATA LEAK.
-- ACTION: Only the Service Role (Backend) can now access or update user data.
-- If client-side SELECT is ever needed, it must be gated by a secure function or Supabase Auth.
DROP POLICY IF EXISTS "Unified Profile Selection" ON user_accounts;

