import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL || "");

/**
 * Compress an image file client-side.
 * Returns a JPEG Blob whose longest side is at most maxWidth.
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
        // Limit the longest side so portrait photos shrink too
        const scale = Math.min(1, maxWidth / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
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
 * iPhone photos are often HEIC even when named .jpg, and most browsers can't display them.
 * Check the file's own header bytes, not just its name.
 */
async function isHeic(file) {
  if (/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true;
  const head = new Uint8Array(await file.slice(4, 12).arrayBuffer());
  return /^ftyp(heic|heix|hevc|hevx|mif1|msf1)/.test(String.fromCharCode(...head));
}

async function heicToJpeg(file) {
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const name = file.name.replace(/\.\w+$/, '') + '.jpg';
  return new File([Array.isArray(out) ? out[0] : out], name, { type: 'image/jpeg' });
}

/**
 * Upload an image file to Convex Storage.
 * Large photos are resized to max 1600px JPEG first.
 * Falls back to base64 data URL if Convex upload fails.
 *
 * @param {File} file
 * @param {string} [_folder] - ignored (Convex uses storageIds), kept for API compat
 * @param {{ allowFallback?: boolean, maxWidth?: number }} [opts]
 * @returns {Promise<string>} public URL or base64 data URL
 */
export async function uploadImage(file, _folder = 'uploads', { allowFallback = true, maxWidth = 1600 } = {}) {
  if (!file) throw new Error('No file provided');

  if (await isHeic(file)) {
    try {
      file = await heicToJpeg(file);
    } catch {
      throw new Error(`${file.name} is an iPhone (HEIC) photo that couldn't be converted. Export it as JPEG and try again.`);
    }
  }

  // Shrink phone photos (often 5–10 MB) for faster uploads & page loads
  let body = file;
  let contentType = file.type || 'image/jpeg';

  if (file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
    try {
      body = await compressImage(file, maxWidth, 0.82);
      contentType = 'image/jpeg';
    } catch {
      // If the browser can't read it, visitors' browsers can't show it either — don't store it
      throw new Error(`${file.name} isn't an image format browsers can display. Save it as JPEG or PNG and try again.`);
    }
  }

  // --- Attempt 1: Convex Storage ---
  try {
    const uploadUrl = await client.mutation(api.fileStorage.generateUploadUrl, {});

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Convex upload failed (${res.status}): ${text}`);
    }

    const { storageId } = await res.json();
    const result = await client.mutation(api.fileStorage.getFileUrl, { storageId });
    return result.file_url;
  } catch (storageError) {
    if (!allowFallback) {
      throw new Error(`Image storage upload failed: ${storageError.message}`);
    }
    console.warn('[Upload] Convex Storage failed, using base64 fallback:', storageError.message);
  }

  // --- Attempt 2: Compress + Base64 data URL ---
  try {
    console.log('[Upload] Compressing image for base64 fallback...');
    const compressed = await compressImage(file, 1200, 0.7);
    const dataUrl = await toBase64(compressed);
    console.log('[Upload] Base64 fallback success. Size:', Math.round(dataUrl.length / 1024), 'KB');
    return dataUrl;
  } catch {
    console.warn('[Upload] Compression failed, using raw base64...');
    const rawDataUrl = await toBase64(file);
    console.log('[Upload] Raw base64 size:', Math.round(rawDataUrl.length / 1024), 'KB');
    return rawDataUrl;
  }
}
