import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const garmentsRouter = Router();

const createGarmentSchema = z.object({
  image_url: z.string().url(),
  category: z.enum(['top', 'bottom', 'shoes', 'outerwear', 'dress', 'accessory']),
  color: z.string().optional(),
  pattern: z.string().optional(),
  formality: z.enum(['casual', 'smart-casual', 'formal']).optional(),
  season: z.array(z.string()).optional(),
  brand: z.string().optional(),
  purchase_price: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/garments
garmentsRouter.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('garments')
    .select('*')
    .eq('user_id', res.locals.userId)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// GET /api/garments/:id
garmentsRouter.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('garments')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .single();

  if (error) { res.status(404).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// POST /api/garments
garmentsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createGarmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('garments')
    .insert({ ...parsed.data, user_id: res.locals.userId })
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.status(201).json({ data, error: null });
});

// PATCH /api/garments/:id
garmentsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = createGarmentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('garments')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// DELETE /api/garments/:id
garmentsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin
    .from('garments')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId);

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.status(204).send();
});
