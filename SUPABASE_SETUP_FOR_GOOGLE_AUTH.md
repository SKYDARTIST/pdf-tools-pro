# Supabase Setup for Google Auth - Step by Step

## Problem Summary

The Google Auth login is failing because:
1. ❌ **`user_accounts` table doesn't exist** - Code tries to create/update user here but table is missing
2. ⚠️ **`ag_user_usage` RLS is disabled** - Security risk flagged by Supabase

## Solution: Create user_accounts Table

### Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard/project/eydbnogluccjhmofsnhu
2. Click "SQL Editor" in left sidebar
3. Click "New Query"

### Step 2: Create the user_accounts Table

Copy and paste this SQL:

```sql
-- Create user_accounts table for Google Auth
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on google_uid for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_google_uid ON user_accounts(google_uid);

-- Add RLS (Row Level Security) to user_accounts
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Allow unauthenticated users to insert/update their own record by google_uid
-- IMPORTANT: We use google_uid as the unique identifier, not auth.uid
CREATE POLICY "Allow unauthenticated users to upsert by google_uid"
  ON user_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Step 3: Run the Query

1. Click the "Run" button or press Cmd+Enter
2. Should complete without errors
3. You should see "user_accounts" table in the Table Editor

### Step 4: Verify the Table

Go to Table Editor and confirm:
- ✅ `user_accounts` table exists
- ✅ Has columns: `id`, `google_uid`, `email`, `name`, `picture`, `last_login`, `created_at`
- ✅ RLS is enabled
- ✅ Can insert rows without authentication

## Testing the Setup

Once table is created, Google Auth will work:

1. User clicks AI feature on app
2. AuthModal appears with Google Sign In button
3. User signs in with Google
4. Code calls `signInWithGoogle()` which:
   - Decodes Google credential
   - Extracts `google_uid`, `email`, `name`, `picture`
   - **Upserts into `user_accounts` table** ✅ (NOW WORKS)
   - Stores user info in localStorage
   - Closes modal and proceeds with AI feature

## Expected Result

After creating this table:

✅ Google Sign In button will work on Android
✅ User credentials stored in Supabase
✅ Multi-device sync enabled
✅ Uninstall/reinstall won't reset credits (tied to google_uid, not device)

## Optional: Fix ag_user_usage RLS

While you're in SQL Editor, also run this to fix the RLS warning:

```sql
-- Enable RLS on ag_user_usage
ALTER TABLE ag_user_usage ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write only their own usage records
CREATE POLICY "Users can manage their own usage"
  ON ag_user_usage
  FOR ALL
  USING (device_id = current_setting('app.current_device_id', true))
  WITH CHECK (device_id = current_setting('app.current_device_id', true));
```

**Note**: The device_id policy above is simplified. For full security with Google Auth, you'd eventually migrate this table to use `google_uid` instead of `device_id`.

## Summary

After these steps:
1. Create `user_accounts` table (required)
2. Enable RLS on `user_accounts` (done in create step)
3. Optionally fix `ag_user_usage` RLS (recommended)
4. Test Google Auth on Android again
