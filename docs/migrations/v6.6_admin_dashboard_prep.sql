-- Anti-Gravity Admin Preparation v6.6
-- Goal: Enhance purchase tracking for the Admin Dashboard

-- 1. Add status and metadata columns to purchase_transactions
ALTER TABLE public.purchase_transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_status ON public.purchase_transactions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_verified_at ON public.purchase_transactions(verified_at);

-- 3. Comment for documentation
COMMENT ON COLUMN public.purchase_transactions.status IS 'success, failed, or pending';
