-- 38: Create early_access_emails table for gathering early testers

CREATE TABLE IF NOT EXISTS public.early_access_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.early_access_emails ENABLE ROW LEVEL SECURITY;

-- Allow insert access to anyone (guest or registered)
DROP POLICY IF EXISTS "Anyone can submit early access email" ON public.early_access_emails;
CREATE POLICY "Anyone can submit early access email" ON public.early_access_emails
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Grants
GRANT INSERT ON public.early_access_emails TO anon, authenticated;
GRANT SELECT ON public.early_access_emails TO authenticated;

SELECT 'Migration 38 applied: early_access_emails table created' AS status;
