import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { garmentsRouter } from './routes/garments';
import { outfitsRouter } from './routes/outfits';
import { suggestionsRouter } from './routes/suggestions';
import { wearLogsRouter } from './routes/wearLogs';
import { shoppingRouter } from './routes/shopping';
import { reportsRouter } from './routes/reports';
import { usersRouter } from './routes/users';
import { scanRouter } from './routes/scan';
import { outfitEngineRouter } from './routes/outfitEngine';
import { jobsRouter } from './routes/jobs';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/requireAuth';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Authenticated API routes
// ---------------------------------------------------------------------------
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/garments', requireAuth, garmentsRouter);
app.use('/api/outfits', requireAuth, outfitsRouter);
app.use('/api/suggestions', requireAuth, suggestionsRouter);
app.use('/api/wear-logs', requireAuth, wearLogsRouter);
app.use('/api/shopping', requireAuth, shoppingRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/scan', requireAuth, scanRouter);
app.use('/api/outfit-engine', requireAuth, outfitEngineRouter);
app.use('/api/jobs', jobsRouter);

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Wearwise backend running on http://localhost:${PORT}`);

  // Warn about missing optional integrations so failures are obvious
  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY)       missing.push('OPENAI_API_KEY (AI tagging disabled — fallback tags used)');
  if (!process.env.ANTHROPIC_API_KEY)    missing.push('ANTHROPIC_API_KEY (outfit explanations disabled)');
  if (!process.env.R2_ENDPOINT)          missing.push('R2_ENDPOINT (using Supabase Storage fallback for images)');

  if (missing.length) {
    console.warn('\n⚠️  Missing env vars:');
    missing.forEach((m) => console.warn(`   • ${m}`));
    console.warn('');
  }
});

export default app;
