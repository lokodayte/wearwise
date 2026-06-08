import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeInput } from '../services/scamAnalysis.service';
import { supabaseAdmin } from '../services/supabaseAdmin';
import type { CheckResponse } from '@wearwise/shared';

export const checksRouter = Router();

const checkRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => (req.res?.locals.userId as string) ?? req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      data: null,
      error: 'You have made too many checks in the last hour. Please try again later.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/checks
checksRouter.post('/', checkRateLimit, async (req: Request, res: Response) => {
  const { type, content } = req.body as { type?: unknown; content?: unknown };
  const userId: string = res.locals.userId;

  if (type !== 'text' && type !== 'link') {
    res.status(400).json({ data: null, error: "type must be 'text' or 'link'" });
    return;
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ data: null, error: 'content must be a non-empty string' });
    return;
  }

  if (content.length > 5000) {
    res
      .status(400)
      .json({ data: null, error: 'content must be under 5000 characters' });
    return;
  }

  const result = await analyzeInput({ type, content: content.trim() });

  const { data: saved, error: dbError } = await supabaseAdmin
    .from('checks')
    .insert({
      user_id: userId,
      input_type: type,
      input_content: content.trim(),
      verdict: result.verdict,
      risk_score: result.riskScore,
      scam_type: result.scamType,
      reasons: result.reasons,
      advice: result.advice,
    })
    .select('id, created_at')
    .single();

  if (dbError || !saved) {
    res.status(500).json({ data: null, error: 'Failed to save check result' });
    return;
  }

  const response: CheckResponse = {
    ...result,
    id: saved.id as string,
    createdAt: saved.created_at as string,
  };

  res.json({ data: response, error: null });
});

// GET /api/checks
checksRouter.get('/', async (_req: Request, res: Response) => {
  const userId: string = res.locals.userId;

  const { data, error } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  const checks = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    inputType: row.input_type,
    inputContent: row.input_content,
    verdict: row.verdict,
    riskScore: row.risk_score,
    scamType: row.scam_type,
    reasons: row.reasons,
    advice: row.advice,
    createdAt: row.created_at,
  }));

  res.json({ data: checks, error: null });
});

// DELETE /api/checks/:id
checksRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId: string = res.locals.userId;
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('checks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data: { deleted: true }, error: null });
});
