-- ============================================================
-- Craftsman Galore — Supabase Storage Setup (SAFE TO RE-RUN)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'craftsman-images',
  'craftsman-images',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Step 2: Drop existing policies (safe if they don't exist)
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Step 3: Create policies for the craftsman-images bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'craftsman-images');

CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'craftsman-images');

CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'craftsman-images')
WITH CHECK (bucket_id = 'craftsman-images');

CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'craftsman-images');
