import { supabase } from './supabaseClient';

/**
 * Compress an image file client-side.
 * Returns a Blob (JPEG, quality 0.7, max 1200px wide).
 */
function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a Blob/File to a base64 data URL string.
 */
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to convert to base64'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload an image file. Tries Supabase Storage first; if that fails,
 * compresses the image and returns a base64 data URL instead.
 * 
 * GUARANTEED to return a usable image URL.
 */
export async function uploadImage(file, folder = 'uploads') {
  if (!file) throw new Error('No file provided');

  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  // --- Attempt 1: Supabase Storage ---
  try {
    console.log('[Upload] Trying Supabase Storage...', { name: file.name, size: file.size, path: filePath });

    const { error } = await supabase.storage
      .from('craftsman-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('craftsman-images').getPublicUrl(filePath);
    console.log('[Upload] Supabase Storage success:', data.publicUrl);
    return data.publicUrl;
  } catch (storageError) {
    console.warn('[Upload] Supabase Storage failed, using base64 fallback:', storageError.message);
  }

  // --- Attempt 2: Compress + Base64 data URL ---
  try {
    console.log('[Upload] Compressing image for base64 fallback...');
    const compressed = await compressImage(file, 1200, 0.7);
    const dataUrl = await toBase64(compressed);
    console.log('[Upload] Base64 fallback success. Size:', Math.round(dataUrl.length / 1024), 'KB');
    return dataUrl;
  } catch (compressError) {
    console.warn('[Upload] Compression failed, using raw base64...');
    // Last resort: raw base64 without compression
    const rawDataUrl = await toBase64(file);
    console.log('[Upload] Raw base64 size:', Math.round(rawDataUrl.length / 1024), 'KB');
    return rawDataUrl;
  }
}
