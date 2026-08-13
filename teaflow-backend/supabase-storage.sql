-- TeaFlow Supabase Storage Setup (least-privilege)
-- Run this in Supabase SQL Editor.
--
-- NOTE: The app currently uploads images to Cloudinary, NOT to Supabase
-- Storage. This bucket exists for future use. It is kept PRIVATE so the
-- public anon key cannot write/overwrite/delete objects.

-- Create storage bucket for menu images (private, no public reads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- Drop any pre-existing broad policies for idempotency
DROP POLICY IF EXISTS "Public can view menu images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete menu images" ON storage.objects;

-- Only the service role (backend) can read/write objects.
CREATE POLICY "Service role can view menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images' AND auth.role() = 'service_role');

CREATE POLICY "Service role can upload menu images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update menu images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-images' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete menu images" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-images' AND auth.role() = 'service_role');
