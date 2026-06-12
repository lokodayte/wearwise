import { Router } from 'express';
import type { Request, Response } from 'express';
import { removeBackground } from '../services/backgroundRemoval.service';
import { tagGarmentWithAI } from '../services/aiTagging.service';
import { uploadGarmentImage } from '../services/r2Storage.service';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const scanRouter = Router();

// Ensure the Supabase Storage bucket exists (used as R2 fallback)
(async () => {
  const { error } = await supabaseAdmin.storage.createBucket('garments', { public: true });
  if (error && !error.message.includes('already exists')) {
    console.warn('[scan] Could not create garments storage bucket:', error.message);
  }
})();

// ---------------------------------------------------------------------------
// POST /api/scan/upload
// Accepts: JSON body { image: "<base64 string>" }
// ---------------------------------------------------------------------------
scanRouter.post('/upload', async (req: Request, res: Response): Promise<void> => {
  const userId: string = res.locals.userId;
  const { image } = req.body;

  if (!image || typeof image !== 'string') {
    res.status(400).json({ data: null, error: 'Missing image field (base64 string)' });
    return;
  }

  try {
    const buffer = Buffer.from(image, 'base64');
    const garment = await processSingleFile(buffer, userId);
    res.status(201).json({ data: [garment], errors: null, processed: 1, failed: 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[scan] processSingleFile failed:', message);
    res.status(422).json({ data: [], errors: [{ error: message }], processed: 0, failed: 1 });
  }
});

// ---------------------------------------------------------------------------
// Per-file pipeline
// ---------------------------------------------------------------------------
async function processSingleFile(buffer: Buffer, userId: string): Promise<object> {
  // Step 1 — Remove background
  let cleanBuffer: Buffer;
  let backgroundRemoved = false;

  try {
    const bgResult = await removeBackground(buffer, 'image/jpeg');
    cleanBuffer = bgResult.buffer;
    backgroundRemoved = bgResult.backgroundRemoved;
  } catch (err) {
    console.warn('[scan] background removal failed, using original:', err);
    cleanBuffer = buffer;
  }

  // Steps 2 + 3 — AI tagging and storage upload in parallel
  const [tags, imageUrl] = await Promise.all([
    tagGarmentWithAI(cleanBuffer),
    uploadGarmentImage(cleanBuffer, userId),
  ]);

  // Step 4 — Persist garment record
  const { data: garment, error: dbError } = await supabaseAdmin
    .from('garments')
    .insert({
      user_id: userId,
      image_url: imageUrl,
      category: tags.category,
      color: tags.color,
      pattern: tags.pattern,
      formality: tags.formality,
      season: tags.season,
      tags: [
        ...tags.style_tags,
        tags.fabric,
        ...(tags.secondaryColor ? [tags.secondaryColor] : []),
      ],
    })
    .select()
    .single();

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

  return { ...garment, ai_tags: tags, background_removed: backgroundRemoved };
}
