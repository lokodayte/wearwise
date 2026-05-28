import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const reportsRouter = Router();

// GET /api/reports
reportsRouter.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('style_reports')
    .select('*')
    .eq('user_id', res.locals.userId)
    .order('generated_at', { ascending: false });

  if (error) { res.status(500).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// GET /api/reports/:month  (e.g. "2024-06")
reportsRouter.get('/:month', async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('style_reports')
    .select('*')
    .eq('user_id', res.locals.userId)
    .eq('month', req.params.month)
    .single();

  if (error) { res.status(404).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});
