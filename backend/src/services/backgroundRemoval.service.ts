import FormData from 'form-data';
import fetch from 'node-fetch';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Background removal service
// Strategy: try remove.bg API first (best quality), fall back to local sharp
// alpha-channel approach if the key is missing, so the pipeline never blocks.
// ---------------------------------------------------------------------------

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY ?? '';
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

export interface RemoveBackgroundResult {
  buffer: Buffer;
  /** true = API removed it, false = passthrough (no key configured) */
  backgroundRemoved: boolean;
}

/**
 * Remove the background from an image buffer.
 * Returns a PNG buffer regardless of input format.
 */
export async function removeBackground(
  inputBuffer: Buffer,
  mimeType: string
): Promise<RemoveBackgroundResult> {
  // ------------------------------------------------------------------
  // 1. Normalise to PNG via sharp (also strips EXIF, resizes if huge)
  // ------------------------------------------------------------------
  const normalised = await sharp(inputBuffer)
    .resize({ width: 1500, height: 1500, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  if (!REMOVE_BG_API_KEY) {
    // No key — return the normalised PNG as-is so the rest of the
    // pipeline still works (AI tagging doesn't need a transparent bg)
    console.warn('[backgroundRemoval] REMOVE_BG_API_KEY not set — skipping bg removal');
    return { buffer: normalised, backgroundRemoved: false };
  }

  // ------------------------------------------------------------------
  // 2. Call remove.bg
  // ------------------------------------------------------------------
  const form = new FormData();
  form.append('image_file', normalised, {
    filename: 'garment.png',
    contentType: 'image/png',
  });
  form.append('size', 'auto');
  form.append('format', 'png');

  const response = await fetch(REMOVE_BG_URL, {
    method: 'POST',
    headers: {
      'X-Api-Key': REMOVE_BG_API_KEY,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`remove.bg error ${response.status}: ${errorText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());
  return { buffer: resultBuffer, backgroundRemoved: true };
}
