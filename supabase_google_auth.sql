-- Create user_accounts table (replaces device-based ag_user_usage)
CREATE TABLE IF NOT EXISTS user_accounts (
  google_uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  tier TEXT NOT NULL DEFAULT 'FREE', -- FREE, PRO, PREMIUM, LIFETIME
  ai_pack_credits INTEGER DEFAULT 0,
  operations_today INTEGER DEFAULT 0,
  ai_docs_weekly INTEGER DEFAULT 0,
  ai_docs_monthly INTEGER DEFAULT 0,
  last_operation_reset TIMESTAMP DEFAULT NOW(),
  last_ai_weekly_reset TIMESTAMP DEFAULT NOW(),
  last_ai_monthly_reset TIMESTAMP DEFAULT NOW(),
  trial_start_date TIMESTAMP,
  has_received_bonus BOOLEAN DEFAULT FALSE,
  purchase_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_tier ON user_accounts(tier);

-- Only users can see their own data
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON user_accounts
  FOR SELECT
  USING (google_uid = auth.uid());

CREATE POLICY "Users can update their own data"
  ON user_accounts
  FOR UPDATE
  USING (google_uid = auth.uid());
