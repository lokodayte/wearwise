import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { removeBackground } from '../services/backgroundRemoval.service';
import { tagGarmentWithAI } from '../services/aiTagging.service';
import { uploadGarmentImage } from '../services/r2Storage.service';
import { supabaseAdmin } from '../services/supabaseAdmin';

// ---------------------------------------------------------------------------
// Multer — memory storage, 10 MB per file, max 20 files
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 20,
  },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are accepted'));
      return;
    }
    cb(null, true);
  },
});

export const scanRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/scan/upload
// Accepts: multipart/form-data  field: photos[]
// ---------------------------------------------------------------------------
scanRouter.post(
  '/upload',
  upload.array('photos[]', 20),
  async (req: Request, res: Response): Promise<void> => {
    const userId: string = res.locals.userId;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ data: null, error: 'No images uploaded. Use field name "photos[]".' });
      return;
    }

    const results = await Promise.allSettled(
      files.map((file) => processSingleFile(file, userId))
    );

    const garments: object[] = [];
    const errors: { filename: string; error: string }[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        garments.push(result.value);
      } else {
        errors.push({
          filename: files[i].originalname,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    res.status(errors.length === files.length ? 422 : 201).json({
      data: garments,
      errors: errors.length > 0 ? errors : null,
      processed: garments.length,
      failed: errors.length,
    });
  }
);

// ---------------------------------------------------------------------------
// Per-file pipeline
// ---------------------------------------------------------------------------
async function processSingleFile(
  file: Express.Multer.File,
  userId: string
): Promise<object> {
  // Step 1 — Remove background
  let cleanBuffer: Buffer;
  let backgroundRemoved = false;

  try {
    const bgResult = await removeBackground(file.buffer, file.mimetype);
    cleanBuffer = bgResult.buffer;
    backgroundRemoved = bgResult.backgroundRemoved;
  } catch (err) {
    console.error('[scan] background removal failed, using original:', err);
    // Don't abort — use the raw image so tagging + storage still work
    cleanBuffer = file.buffer;
  }

  // Steps 2 + 3 — AI tagging and R2 upload run in parallel
  const [tags, imageUrl] = await Promise.all([
    tagGarmentWithAI(cleanBuffer),
    uploadGarmentImage(cleanBuffer, userId),
  ]);

  // Step 4 — Persist garment record in Supabase
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

  if (dbError) {
    throw new Error(`DB insert failed: ${dbError.message}`);
  }

  return {
    ...garment,
    ai_tags: tags,
    background_removed: backgroundRemoved,
  };
}
