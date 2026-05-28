import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { generateOutfit } from '../services/outfitEngine.service';

export const outfitEngineRouter = Router();

const generateSchema = z.object({
  weatherTemp: z.number(),
  weatherDesc: z.string().min(1),
  occasion: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// POST /api/outfit-engine/generate
outfitEngineRouter.post('/generate', async (req: Request, res: Response): Promise<void> => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const context = {
    ...parsed.data,
    date: parsed.data.date ?? new Date().toISOString().slice(0, 10),
  };

  try {
    const result = await generateOutfit(res.locals.userId, context);
    res.status(201).json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Outfit generation failed';
    res.status(422).json({ data: null, error: message });
  }
});
