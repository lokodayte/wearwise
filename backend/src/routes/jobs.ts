import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateDailySuggestionsForAllUsers } from '../jobs/dailySuggestions';

export const jobsRouter = Router();

// POST /api/jobs/daily-suggestions
// Protected by CRON_SECRET header — call from a cron service (e.g. GitHub Actions, Render cron)
jobsRouter.post('/daily-suggestions', async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await generateDailySuggestionsForAllUsers();
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[jobs/daily-suggestions]', err);
    res.status(500).json({ error: err.message });
  }
});
