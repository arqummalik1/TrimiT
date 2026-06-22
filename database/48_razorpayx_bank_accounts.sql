-- Migration 48: Modify salon_bank_accounts for RazorpayX Payouts
-- Replaces Razorpay Route (Linked Accounts) with RazorpayX (Contacts & Fund Accounts)

ALTER TABLE salon_bank_accounts 
DROP COLUMN IF EXISTS razorpay_linked_account_id;

ALTER TABLE salon_bank_accounts 
ADD COLUMN razorpayx_contact_id TEXT,
ADD COLUMN razorpayx_fund_account_id TEXT;

COMMENT ON COLUMN salon_bank_accounts.razorpayx_contact_id IS 'RazorpayX Contact ID representing the salon owner.';
COMMENT ON COLUMN salon_bank_accounts.razorpayx_fund_account_id IS 'RazorpayX Fund Account ID linked to the contact for payouts.';
