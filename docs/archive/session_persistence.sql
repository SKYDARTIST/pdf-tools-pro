-- Anti-Gravity Session Persistence (Fix for 401 Unauthorized)
-- This table stores issued session tokens to ensure authoratative validation
-- and prevent issues with stateless token expiration or verification lag.

CREATE TABLE IF NOT EXISTS sessions (
    session_token TEXT PRIMARY KEY,
    user_uid TEXT NOT NULL,
    device_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user-based cleanup and validation
CREATE INDEX IF NOT EXISTS idx_sessions_user_uid ON sessions(user_uid);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Security: Enable RLS but restrict to Service Role only
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- No public access - Backend Service Role only (v2.9.2)
DROP POLICY IF EXISTS "Service Role Only" ON sessions;
CREATE POLICY "Service Role Only" ON sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
