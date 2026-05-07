-- ==========================================
-- 21 - ADD PUSH NOTIFICATION TOKENS
-- Adds push_token column to users table for mobile push notifications
-- ==========================================

-- Add push_token column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token) 
WHERE push_token IS NOT NULL;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT UPDATE ON public.users TO authenticated;

-- Success message
SELECT '✅ 21 - Push token column added successfully!' as status;
SELECT '📱 Users can now register for push notifications' as next_step;
