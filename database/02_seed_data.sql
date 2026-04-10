-- ==========================================
-- 02 - SEED DATA
-- RUN THIS SECOND: Creates test salons and services
-- ==========================================

-- Drop FK constraint temporarily to allow seeding with placeholder owner IDs
ALTER TABLE public.salons DROP CONSTRAINT IF EXISTS salons_owner_id_fkey;

-- Insert test salons
INSERT INTO public.salons (
    id, owner_id, name, description, address, city, 
    latitude, longitude, phone, opening_time, closing_time, images,
    allow_multiple_bookings_per_slot
) VALUES 
('db89fece-7dab-4911-85a2-4f1235766dab', '00000000-0000-0000-0000-000000000001', 
 'Classic Cuts Salon', 'Premium hair styling services', 
 '123 Main Street', 'Mumbai', 19.0760, 72.8777, '+91 98765 43210',
 '09:00', '21:00', 
 ARRAY['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'],
 FALSE),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '00000000-0000-0000-0000-000000000002',
 'Style Studio', 'Trendy salon for groups and bridal', 
 '456 Fashion Avenue', 'Mumbai', 19.0596, 72.8295, '+91 98765 12345',
 '10:00', '20:00', 
 ARRAY['https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800'],
 TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    allow_multiple_bookings_per_slot = EXCLUDED.allow_multiple_bookings_per_slot;

-- Insert services for Classic Cuts
INSERT INTO public.services (id, salon_id, name, description, price, duration) VALUES
('053bc3f3-5e31-466f-beaa-e2e66fc93dcf', 'db89fece-7dab-4911-85a2-4f1235766dab', 'Haircut', 'Classic haircut with wash and styling', 450, 60),
('153bc3f3-5e31-466f-beaa-e2e66fc93dd0', 'db89fece-7dab-4911-85a2-4f1235766dab', 'Beard Trim', 'Precision beard trimming', 250, 30),
('253bc3f3-5e31-466f-beaa-e2e66fc93dd1', 'db89fece-7dab-4911-85a2-4f1235766dab', 'Hair Coloring', 'Full hair coloring', 1200, 120)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- Insert services for Style Studio
INSERT INTO public.services (id, salon_id, name, description, price, duration) VALUES
('553bc3f3-5e31-466f-beaa-e2e66fc93dd4', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Group Haircut', 'Package for 2+ people', 800, 90),
('653bc3f3-5e31-466f-beaa-e2e66fc93dd5', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Manicure & Pedicure', 'Spa manicure and pedicure', 600, 60)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- Enable realtime for bookings (idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
    END IF;
END $$;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
SELECT '✅ 02 - Seed data created successfully!' as status;
SELECT '📍 Test URLs:' as info;
SELECT '  Classic Cuts: http://localhost:3000/booking/db89fece-7dab-4911-85a2-4f1235766dab/053bc3f3-5e31-466f-beaa-e2e66fc93dcf' as link1;
SELECT '  Style Studio: http://localhost:3000/booking/a1b2c3d4-e5f6-7890-abcd-ef1234567890/553bc3f3-5e31-466f-beaa-e2e66fc93dd4' as link2;
SELECT '⚠️  Note: FK constraint dropped. Re-add manually if needed for production.' as warning;
SELECT '📋 Next: Run 03_setup_storage.sql (after creating bucket manually)' as next_step;
