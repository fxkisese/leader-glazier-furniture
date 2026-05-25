/**
 * SUPABASE CONFIGURATION CHECKLIST
 * 
 * This file documents what needs to be configured in Supabase for the app to work correctly.
 * Run this checklist in your Supabase project dashboard.
 */

// ============================================================
// 1. CREATE STORAGE BUCKET
// ============================================================
// Go to: Supabase Dashboard → Storage
// Action: Create a new bucket named "media"
// Settings:
//   - Name: media
//   - Visibility: Public
//   - File size limit: 52 MB (or higher)

// ============================================================
// 2. STORAGE RLS POLICIES
// ============================================================
// Go to: Supabase Dashboard → Storage → Policies (media bucket)
// Create these policies:

-- Policy: Allow public read access to all files in media bucket
CREATE POLICY "Public read media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media');

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated upload media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Allow public upload (if needed for demo)
CREATE POLICY "Public upload media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'media');

// ============================================================
// 3. DATABASE TABLES
// ============================================================
// All tables should be created by running supabase/schema.sql
// Tables that must exist:
// - products
// - glass_types
// - gallery_items
// - quote_requests
// - custom_order_requests
// - accessories
// - site_settings
// - quote_accessories
// - reviews
// - sales
// - credit_customers
// - expenses
// - standard_sizes

// ============================================================
// 4. DATABASE RLS POLICIES
// ============================================================
// All RLS policies are defined in supabase/schema.sql
// Key policies:
// - Public read access to: products, glass_types, gallery_items, reviews
// - Public insert access to: quote_requests, custom_order_requests
// - Admin full access to all tables

// ============================================================
// 5. TEST THE CONNECTION
// ============================================================
// Run in browser console after app loads:

// Test 1: Verify Supabase client is configured
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

// Test 2: Test upload functionality
async function testUpload() {
  const { base44 } = await import('./src/api/base44Client.js');
  const file = new File(['test'], 'test.txt', { type: 'text/plain' });
  try {
    const result = await base44.integrations.Core.UploadFile({ file });
    console.log('Upload successful:', result.file_url);
  } catch (err) {
    console.error('Upload failed:', err.message);
  }
}

// Test 3: Test glass types fetch
async function testGlassTypes() {
  const { base44 } = await import('./src/api/base44Client.js');
  try {
    const types = await base44.entities.GlassType.list();
    console.log('Glass types fetched:', types.length, 'items');
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

// ============================================================
// 6. TROUBLESHOOTING
// ============================================================
// Issue: Images not uploading
// Solution: 
//   1. Check "media" bucket exists in Supabase Storage
//   2. Check RLS policies allow uploads
//   3. Check VITE_SUPABASE_URL is correct (no /rest/v1/)

// Issue: Glass types not displaying
// Solution:
//   1. Check glass_types table exists and has data
//   2. Check public read policy is enabled
//   3. Check GlassType.list() returns data in browser console

// Issue: 403 Forbidden errors
// Solution:
//   1. Check RLS policies are correctly configured
//   2. Verify bucket visibility is "Public"
//   3. Check auth token is valid

// ============================================================
