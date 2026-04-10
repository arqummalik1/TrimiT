-- Migration: Add offer/discount columns to services table
-- Run this after 03_setup_storage.sql

-- Add offer columns to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER CHECK (discount_percentage BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS original_price INTEGER,
ADD COLUMN IF NOT EXISTS offer_start_date DATE,
ADD COLUMN IF NOT EXISTS offer_end_date DATE,
ADD COLUMN IF NOT EXISTS offer_tagline TEXT DEFAULT 'Grab it before it''s gone!',
ADD COLUMN IF NOT EXISTS is_on_offer BOOLEAN DEFAULT FALSE;

-- Create index for efficient offer filtering
CREATE INDEX IF NOT EXISTS idx_services_is_on_offer ON services(is_on_offer);
CREATE INDEX IF NOT EXISTS idx_services_offer_dates ON services(offer_start_date, offer_end_date);

-- Add comment for documentation
COMMENT ON COLUMN services.discount_percentage IS 'Discount percentage (0-100). Example: 20 for 20% off';
COMMENT ON COLUMN services.original_price IS 'Original price before discount. Set automatically when offer is enabled';
COMMENT ON COLUMN services.offer_start_date IS 'Offer start date (YYYY-MM-DD)';
COMMENT ON COLUMN services.offer_end_date IS 'Offer end date (YYYY-MM-DD)';
COMMENT ON COLUMN services.offer_tagline IS 'Marketing tagline shown on service cards. Default: Grab it before it''s gone!';
COMMENT ON COLUMN services.is_on_offer IS 'True if service currently has an active offer';

-- Success message
SELECT 'Service offers columns added successfully!' as result;
