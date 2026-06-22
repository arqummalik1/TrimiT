-- 47: Add salon bank accounts for split payments and platform fee

-- Add platform fee to salons table
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS platform_fee_percentage NUMERIC DEFAULT 0.0;

-- Create salon_bank_accounts table for Razorpay Linked Accounts
CREATE TABLE IF NOT EXISTS public.salon_bank_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    razorpay_linked_account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_number_last4 TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(salon_id) -- One bank account per salon for now
);

-- RLS policies
ALTER TABLE public.salon_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Salons can read their own bank account
CREATE POLICY "Salon owners can view their bank account"
    ON public.salon_bank_accounts FOR SELECT
    USING (auth.uid() = salon_id);

-- Salons can insert their own bank account
CREATE POLICY "Salon owners can insert their bank account"
    ON public.salon_bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = salon_id);

-- Salons can update their own bank account
CREATE POLICY "Salon owners can update their bank account"
    ON public.salon_bank_accounts FOR UPDATE
    USING (auth.uid() = salon_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_salon_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_salon_bank_accounts_updated_at ON public.salon_bank_accounts;
CREATE TRIGGER update_salon_bank_accounts_updated_at
    BEFORE UPDATE ON public.salon_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_salon_bank_accounts_updated_at();

SELECT 'Migration 47 applied: salon_bank_accounts and platform_fee_percentage added' AS status;
