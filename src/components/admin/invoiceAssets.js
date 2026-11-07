// Stamp and signature images for invoices. Kept in this browser only (never uploaded),
// so a signature never sits at a public URL.

const KEYS = { stamp: "invoice-stamp", signature: "invoice-signature", signer: "invoice-signer" };

/** { data: PNG data URL, w, h } or null */
export function readAsset(kind) {
  try {
    const v = localStorage.getItem(KEYS[kind]);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser refused to store it (private mode / full storage). */
export function saveAsset(kind, asset) {
  try {
    if (asset) localStorage.setItem(KEYS[kind], JSON.stringify(asset));
    else localStorage.removeItem(KEYS[kind]);
    return true;
  } catch {
    return false;
  }
}

export const readSigner = () => { try { return localStorage.getItem(KEYS.signer) || ""; } catch { return ""; } };
export const saveSigner = (v) => { try { localStorage.setItem(KEYS.signer, v); } catch { /* ignore */ } };

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("Couldn't read that image - use a PNG or JPG"));
  img.src = src;
});

/**
 * Photos of a stamp or signature on paper: make the paper transparent so only the ink prints.
 * The paper colour is taken from the image itself, so a greyish photo still clears cleanly.
 * Images that already have transparency are left alone.
 */
function knockOutPaper(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const px = img.data;
  const lum = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    if (px[i + 3] < 250) return; // already transparent
    lum[p] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
  }
  const sorted = Uint8Array.from(lum).sort();
  const paper = sorted[Math.floor(sorted.length * 0.85)]; // most of the image is paper
  const clear = paper - 18, solid = paper - 80;
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const l = lum[p];
    px[i + 3] = l >= clear ? 0 : l <= solid ? 255 : Math.round(((clear - l) / (clear - solid)) * 255);
  }
  ctx.putImageData(img, 0, 0);
}

/** Crop to the visible ink, with a little padding. */
function trim(canvas) {
  const { width, height } = canvas;
  const px = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (px[(y * width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null; // nothing there
  const pad = 6;
  x0 = Math.max(x0 - pad, 0); y0 = Math.max(y0 - pad, 0);
  x1 = Math.min(x1 + pad, width - 1); y1 = Math.min(y1 + pad, height - 1);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Cleans up a drawn or photographed canvas into a stored asset. */
export function canvasToAsset(canvas) {
  knockOutPaper(canvas);
  const c = trim(canvas);
  if (!c) throw new Error("The image looks empty");
  return { data: c.toDataURL("image/png"), w: c.width, h: c.height };
}

export async function fileToAsset(file, maxSide = 600) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose a PNG or JPG image");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvasToAsset(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
