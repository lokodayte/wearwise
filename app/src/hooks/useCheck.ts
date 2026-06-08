import { useState } from 'react';
import { request } from '../services/api';
import type { CheckResponse, ScamCheck } from '@wearwise/shared';

export function useCheck() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCheck = async (
    type: 'text' | 'link',
    content: string
  ): Promise<CheckResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await request<CheckResponse>('POST', '/api/checks', { type, content });
      return result;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { submitCheck, loading, error };
}

export function useCheckHistory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<ScamCheck[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<ScamCheck[]>('GET', '/api/checks');
      setChecks(data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load history.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteCheck = async (id: string) => {
    try {
      await request<void>('DELETE', `/api/checks/${id}`);
      setChecks((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // swallow; the item stays in the list
    }
  };

  return { checks, fetchHistory, deleteCheck, loading, error };
}
