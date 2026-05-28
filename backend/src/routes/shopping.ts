import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const shoppingRouter = Router();

const clickSchema = z.object({ clicked: z.boolean() });
const purchasedSchema = z.object({ purchased: z.boolean() });

// GET /api/shopping
shoppingRouter.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('shopping_recs')
    .select('*')
    .eq('user_id', res.locals.userId)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// PATCH /api/shopping/:id/click
shoppingRouter.patch('/:id/click', async (req: Request, res: Response) => {
  const parsed = clickSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('shopping_recs')
    .update({ clicked: parsed.data.clicked })
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// PATCH /api/shopping/:id/purchased
shoppingRouter.patch('/:id/purchased', async (req: Request, res: Response) => {
  const parsed = purchasedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('shopping_recs')
    .update({ purchased: parsed.data.purchased })
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});
