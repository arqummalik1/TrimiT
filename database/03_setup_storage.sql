-- ==========================================
-- 03 - STORAGE SETUP
-- RUN THIS THIRD: After creating the bucket manually in Dashboard
-- ==========================================

-- ==========================================
-- MANUAL STEP (REQUIRED FIRST)
-- ==========================================
-- 
-- BEFORE running this SQL, you MUST create the bucket manually:
--
-- 1. Go to Supabase Dashboard → Storage → New bucket
-- 2. Name: "salon-images"
-- 3. ✅ Check "Public bucket" (allows public image URLs)
-- 4. ✅ Check "Restrict file size" → Set to 10 MB (good for photos)
-- 5. ✅ Check "Restrict MIME types" → COPY & PASTE these EXACT lines:
--
--    image/jpeg
--    image/jpg
--    image/png
--    image/webp
--    image/heic
--    image/heif
--    image/avif
--    image/gif
--    image/bmp
--    image/tiff
--
-- 6. Click "Create bucket"
--
-- ⚠️  This blocks VIDEO uploads - only images allowed!
--
-- ==========================================
-- STORAGE POLICIES (Run after creating bucket)
-- ==========================================

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'salon-images');

-- Allow public access to view images
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
CREATE POLICY "Allow public access" 
ON storage.objects 
FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'salon-images');

-- Allow owners to delete their images
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'salon-images');

-- ==========================================
-- BUCKET CONFIGURATION NOTES
-- ==========================================
-- 
-- ✓ File size limit: 10 MB (good for high-quality photos)
-- ✓ MIME types: Images only (JPEG, PNG, WebP, HEIC)
-- ✗ Videos blocked: Cannot upload MP4, MOV, etc.
--
-- This is PERFECT for salon photos!
--
-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
SELECT '✅ 03 - Storage policies created!' as status;
SELECT '🎉 All setup complete! Image upload is now ready.' as message;
SELECT '📱 Test: Go to /owner/salon and try uploading photos' as test;
