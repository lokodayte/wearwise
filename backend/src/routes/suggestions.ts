import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const suggestionsRouter = Router();

// GET /api/suggestions/today
suggestionsRouter.get('/today', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('daily_suggestions')
    .select('*, outfits(*)')
    .eq('user_id', res.locals.userId)
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  if (data) {
    // Mark as viewed
    await supabaseAdmin
      .from('daily_suggestions')
      .update({ viewed: true })
      .eq('id', data.id);
  }

  res.json({ data: data ?? null, error: null });
});

// POST /api/suggestions/:id/act-on
suggestionsRouter.post('/:id/act-on', async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('daily_suggestions')
    .update({ acted_on: true })
    .eq('id', req.params.id)
    .eq('user_id', res.locals.userId)
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// GET /api/suggestions/history
suggestionsRouter.get('/history', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 30), 100);

  const { data, error } = await supabaseAdmin
    .from('daily_suggestions')
    .select('*')
    .eq('user_id', res.locals.userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) { res.status(500).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});
