import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;

  // Don't leak internal details for 5xx
  const message = status >= 500
    ? 'Internal server error'
    : (err.message ?? 'Something went wrong');

  if (status >= 500) {
    console.error('[error]', err.stack ?? err.message);
  }

  res.status(status).json({ data: null, error: message });
}
