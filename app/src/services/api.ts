import Constants from 'expo-constants';
import { supabase } from './supabase';

const BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

const TIMEOUT_MS = 15_000;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return json.data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Suggestions ──────────────────────────────────────────────────────────────

export const suggestionsApi = {
  getToday: () => request<DailySuggestionWithOutfit>('GET', '/api/suggestions/today'),

  refresh: (weatherTemp: number, weatherDesc: string, occasion: string) =>
    request<OutfitEngineResult>('POST', '/api/outfit-engine/generate', {
      weatherTemp,
      weatherDesc,
      occasion,
      date: new Date().toISOString().slice(0, 10),
    }),

  actOn: (id: string) => request<void>('POST', `/api/suggestions/${id}/act-on`),
};

// ── Wear logs ─────────────────────────────────────────────────────────────────

export const wearLogsApi = {
  create: (payload: {
    outfit_id?: string;
    garment_ids: string[];
    worn_date: string;
    occasion?: string;
  }) => request<void>('POST', '/api/wear-logs', payload),
};

// ── Outfits / rating ──────────────────────────────────────────────────────────

export const outfitsApi = {
  rate: (outfitId: string, rating: 'loved' | 'worn' | 'skipped') =>
    request<void>('PATCH', `/api/outfits/${outfitId}/rate`, { rating }),
};

// ── Garments ──────────────────────────────────────────────────────────────────

export const garmentsApi = {
  getForgotten: async (): Promise<GarmentItem[]> => {
    const all = await request<GarmentItem[]>('GET', '/api/garments');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return all.filter(
      (g) => !g.last_worn || new Date(g.last_worn) < cutoff
    );
  },
};

// ── Shared local types ────────────────────────────────────────────────────────

export interface GarmentItem {
  id: string;
  image_url: string;
  category: string;
  color: string | null;
  formality: string | null;
  brand: string | null;
  tags: string[];
  last_worn: string | null;
  times_worn: number;
}

export interface OutfitEngineResult {
  outfitId: string;
  garments: GarmentItem[];
  explanation: string;
  score: number;
  occasion: string;
  weatherContext: { temp_c: number; condition: string };
}

export interface DailySuggestionWithOutfit {
  id: string;
  outfit_id: string | null;
  score: number;
  reason_codes: string[];
  weather_snapshot: { temp_c?: number; condition?: string } | null;
  viewed: boolean;
  acted_on: boolean;
  outfits: {
    id: string;
    garment_ids: string[];
    ai_explanation: string | null;
    occasion: string | null;
    weather_context: { temp_c?: number; condition?: string } | null;
  } | null;
}
