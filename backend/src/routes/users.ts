import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabaseAdmin';

export const usersRouter = Router();

const styleProfileSchema = z.object({
  preferred_styles: z.array(z.string()).optional(),
  preferred_colors: z.array(z.string()).optional(),
  avoided_colors: z.array(z.string()).optional(),
  body_shape: z.string().optional(),
  style_icons: z.array(z.string()).optional(),
});

// GET /api/users/me
usersRouter.get('/me', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', res.locals.userId)
    .single();

  if (error) { res.status(404).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// POST /api/users/push-token
usersRouter.post('/push-token', async (req: Request, res: Response) => {
  const token = req.body?.token;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ data: null, error: 'token required' });
    return;
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ push_token: token })
    .eq('id', res.locals.userId);

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data: { ok: true }, error: null });
});

// PATCH /api/users/me
usersRouter.patch('/me', async (req: Request, res: Response) => {
  const parsed = styleProfileSchema.safeParse(req.body.style_profile);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: parsed.error.message });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ style_profile: parsed.data })
    .eq('id', res.locals.userId)
    .select()
    .single();

  if (error) { res.status(400).json({ data: null, error: error.message }); return; }
  res.json({ data, error: null });
});

// DELETE /api/users/me
usersRouter.delete('/me', async (_req: Request, res: Response) => {
  const userId = res.locals.userId;

  // Delete all user data first (RLS cascades won't apply for admin client)
  await Promise.allSettled([
    supabaseAdmin.from('wear_logs').delete().eq('user_id', userId),
    supabaseAdmin.from('daily_suggestions').delete().eq('user_id', userId),
    supabaseAdmin.from('shopping_recs').delete().eq('user_id', userId),
    supabaseAdmin.from('style_reports').delete().eq('user_id', userId),
    supabaseAdmin.from('outfits').delete().eq('user_id', userId),
    supabaseAdmin.from('garments').delete().eq('user_id', userId),
  ]);

  // Delete from users table
  await supabaseAdmin.from('users').delete().eq('id', userId);

  // Delete the auth user
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    res.status(500).json({ data: null, error: 'Failed to delete account' });
    return;
  }

  res.json({ data: { ok: true }, error: null });
});

