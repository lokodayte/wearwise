import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const outfitsRouter = Router();

const createOutfitSchema = z.object({
  garment_ids: z.array(z.string().uuid()).min(1),
  occasion: z.string().optional(),
  weather_context: z.record(z.unknown()).optional(),
});

const rateOutfitSchema = z.object({
  rating: z.enum(['loved', 'worn', 'skipped']),
  worn_on: z.string().optional(),
});

// GET /api/outfits
outfitsRouter.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('outfits')
    .select('*')
    .eq('user_id', res.locals.userId)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// GET /api/outfits/:id
outfitsRouter.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('outfits')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .single();

  if (error) { res.status(404).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// POST /api/outfits
outfitsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createOutfitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('outfits')
    .insert({ ...parsed.data, user_id: res.locals.userId })
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.status(201).json({ data, error: null });
});

// PATCH /api/outfits/:id/rate
outfitsRouter.patch('/:id/rate', async (req: Request, res: Response) => {
  const parsed = rateOutfitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('outfits')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});
