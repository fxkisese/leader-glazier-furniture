/**
 * COMPLETE DEBUG & VERIFICATION GUIDE
 * 
 * Follow these steps to verify everything is working:
 */

// ============================================================
// STEP 1: VERIFY ENVIRONMENT VARIABLES
// ============================================================
console.log('Step 1: Checking environment variables...');
console.log({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  isDev: import.meta.env.DEV,
});

// Expected output:
// {
//   supabaseUrl: "https://yeiafctyyaejsgpcojqu.supabase.co",
//   hasAnonKey: true,
//   isDev: true or false
// }

// ============================================================
// STEP 2: VERIFY SUPABASE CLIENT
// ============================================================
async function verifySupabaseClient() {
  console.log('\nStep 2: Verifying Supabase client...');
  try {
    const { supabase } = await import('./src/api/supabaseClient.js');
    const { data, error } = await supabase.from('glass_types').select('count', { count: 'exact' });
    if (error) throw error;
    console.log('✅ Supabase client connected');
    return true;
  } catch (err) {
    console.error('❌ Supabase client error:', err.message);
    return false;
  }
}

// ============================================================
// STEP 3: TEST GLASS TYPES FETCH
// ============================================================
async function testGlassTypeFetch() {
  console.log('\nStep 3: Testing glass types fetch...');
  try {
    const { base44 } = await import('./src/api/base44Client.js');
    const types = await base44.entities.GlassType.list();
    console.log(`✅ Fetched ${types.length} glass types`);
    if (types.length > 0) {
      console.log('First glass type:', types[0]);
    } else {
      console.warn('⚠️ No glass types in database. Add some via Admin Dashboard.');
    }
    return types;
  } catch (err) {
    console.error('❌ Glass type fetch error:', err.message);
    throw err;
  }
}

// ============================================================
// STEP 4: TEST GALLERY PROJECTS FETCH
// ============================================================
async function testGalleryFetch() {
  console.log('\nStep 4: Testing gallery projects fetch...');
  try {
    const { base44 } = await import('./src/api/base44Client.js');
    const projects = await base44.entities.GalleryProject.list();
    console.log(`✅ Fetched ${projects.length} gallery projects`);
    if (projects.length > 0) {
      console.log('First project:', projects[0]);
    } else {
      console.warn('⚠️ No gallery projects in database. Add some via Admin Dashboard.');
    }
    return projects;
  } catch (err) {
    console.error('❌ Gallery fetch error:', err.message);
    throw err;
  }
}

// ============================================================
// STEP 5: TEST IMAGE UPLOAD (WITH DEMO FILE)
// ============================================================
async function testImageUpload() {
  console.log('\nStep 5: Testing image upload...');
  try {
    const { base44 } = await import('./src/api/base44Client.js');
    
    // Create a test image (1x1 pixel white PNG)
    const pngData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x90, 0x5B, 0x9F, 0x77, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const file = new File([pngData], 'test.png', { type: 'image/png' });
    const result = await base44.integrations.Core.UploadFile({ file });
    
    console.log('✅ Upload successful!');
    console.log('File URL:', result.file_url);
    
    // Verify image is accessible
    const response = await fetch(result.file_url);
    if (response.ok) {
      console.log('✅ Image is publicly accessible');
    } else {
      console.warn('⚠️ Image upload successful but not immediately accessible');
    }
    
    return result;
  } catch (err) {
    console.error('❌ Upload error:', err.message);
    throw err;
  }
}

// ============================================================
// STEP 6: TEST PRODUCT FETCH (WITH FILTERING)
// ============================================================
async function testProductFilter() {
  console.log('\nStep 6: Testing product filtering...');
  try {
    const { base44 } = await import('./src/api/base44Client.js');
    
    // Test fetch all
    const allProducts = await base44.entities.Product.list();
    console.log(`✅ Fetched ${allProducts.length} total products`);
    
    // Test filter by category
    const furnProducts = await base44.entities.Product.filter(
      { category: 'sofas', is_published: true },
      '-created_at',
      10
    );
    console.log(`✅ Filtered to ${furnProducts.length} sofas`);
    
    return { allProducts, furnProducts };
  } catch (err) {
    console.error('❌ Product filter error:', err.message);
    throw err;
  }
}

// ============================================================
// COMPLETE TEST RUNNER
// ============================================================
async function runAllTests() {
  console.log('🔍 STARTING COMPLETE DEBUG TEST...\n');
  console.log('=' .repeat(60));
  
  try {
    await verifySupabaseClient();
    const glassTypes = await testGlassTypeFetch();
    const gallery = await testGalleryFetch();
    const upload = await testImageUpload();
    const products = await testProductFilter();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log(`  - Glass types: ${glassTypes.length}`);
    console.log(`  - Gallery projects: ${gallery.length}`);
    console.log(`  - Image upload: Working`);
    console.log(`  - Total products: ${products.allProducts.length}`);
    console.log('\n✅ Your application is ready to go!');
    
  } catch (err) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check .env.local has correct VITE_SUPABASE_URL');
    console.error('2. Verify "media" bucket exists in Supabase Storage');
    console.error('3. Check RLS policies are enabled in Supabase');
    console.error('4. Run supabase/schema.sql in Supabase SQL editor');
  }
}

// ============================================================
// RUN TESTS
// ============================================================
// Copy and paste this in the browser console:
// await import('./DEBUG_GUIDE.js').then(m => m.runAllTests());

export {
  verifySupabaseClient,
  testGlassTypeFetch,
  testGalleryFetch,
  testImageUpload,
  testProductFilter,
  runAllTests
};
