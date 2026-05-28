import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const wearLogsRouter = Router();

const createWearLogSchema = z.object({
  outfit_id: z.string().uuid().optional(),
  garment_ids: z.array(z.string().uuid()).min(1),
  worn_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  occasion: z.string().optional(),
  weather_temp: z.number().int().optional(),
  weather_desc: z.string().optional(),
  user_rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

// GET /api/wear-logs
wearLogsRouter.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const from = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('wear_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', res.locals.userId)
    .order('worn_date', { ascending: false })
    .range(from, from + limit - 1);

  if (error) { res.status(500).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null, total: count, page, per_page: limit });
});

// POST /api/wear-logs
wearLogsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createWearLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('wear_logs')
    .insert({ ...parsed.data, user_id: res.locals.userId })
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.status(201).json({ data, error: null });
});
