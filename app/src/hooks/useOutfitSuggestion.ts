import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import {
  request,
  suggestionsApi,
  garmentsApi,
  outfitsApi,
  wearLogsApi,
  type OutfitEngineResult,
  type GarmentItem,
} from '../services/api';

export type OutfitStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

export interface AlternativeOutfit {
  occasion: string;
  garments: GarmentItem[];
  explanation: string;
}

export interface SuggestionState {
  suggestionId: string | null;
  outfitId: string | null;
  garments: GarmentItem[];
  explanation: string;
  occasion: string;
  weatherTemp: number | null;
  weatherDesc: string;
  score: number;
  forgottenItems: GarmentItem[];
  alternatives: AlternativeOutfit[];
  alternativesLoading: boolean;
  status: OutfitStatus;
  error: string | null;
  userFirstName: string;
}

const INITIAL: SuggestionState = {
  suggestionId: null,
  outfitId: null,
  garments: [],
  explanation: '',
  occasion: '',
  weatherTemp: null,
  weatherDesc: '',
  score: 0,
  forgottenItems: [],
  alternatives: [],
  alternativesLoading: false,
  status: 'idle',
  error: null,
  userFirstName: '',
};

export function useOutfitSuggestion() {
  const [state, setState] = useState<SuggestionState>(INITIAL);

  // ── Load alternatives in background ──────────────────────────────────────

  const loadAlternatives = useCallback(
    async (weatherTemp: number, weatherDesc: string) => {
      setState((s) => ({ ...s, alternativesLoading: true }));
      try {
        const results = await request<OutfitEngineResult[]>(
          'POST',
          '/api/outfit-engine/alternatives',
          { weatherTemp, weatherDesc, occasion: 'casual' }
        );

        const alternatives: AlternativeOutfit[] = (results ?? []).map((r) => ({
          occasion: r.occasion,
          garments: r.garments,
          explanation: r.explanation,
        }));

        setState((s) => ({ ...s, alternatives, alternativesLoading: false }));
      } catch {
        setState((s) => ({ ...s, alternativesLoading: false }));
      }
    },
    []
  );

  // ── Load today's suggestion ────────────────────────────────────────────────

  const loadToday = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));

    try {
      const [suggestion, forgotten, { data: userData }] = await Promise.all([
        suggestionsApi.getToday(),
        garmentsApi.getForgotten(),
        supabase.auth.getUser(),
      ]);

      const firstName = extractFirstName(userData?.user?.email ?? '');

      if (!suggestion || !suggestion.outfits) {
        await refresh(true);
        return;
      }

      const garments = suggestion.outfits.garment_ids
        ? await fetchGarmentsByIds(suggestion.outfits.garment_ids)
        : [];

      const weatherTemp = suggestion.weather_snapshot?.temp_c ?? 18;
      const weatherDesc = suggestion.weather_snapshot?.condition ?? 'clear';

      setState({
        suggestionId: suggestion.id,
        outfitId: suggestion.outfit_id,
        garments,
        explanation: suggestion.outfits.ai_explanation ?? '',
        occasion: suggestion.outfits.occasion ?? 'Today',
        weatherTemp,
        weatherDesc,
        score: suggestion.score,
        forgottenItems: forgotten,
        alternatives: [],
        alternativesLoading: true,
        status: 'success',
        error: null,
        userFirstName: firstName,
      });

      // Fetch alternatives in background
      loadAlternatives(weatherTemp, weatherDesc);
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load outfit',
      }));
    }
  }, []);

  // ── Refresh / get a new suggestion ────────────────────────────────────────

  const refresh = useCallback(
    async (silent = false, weatherTemp = 18, weatherDesc = 'clear', occasion = 'casual') => {
      setState((s) => ({ ...s, status: silent ? 'loading' : 'refreshing', error: null }));

      try {
        const [result, forgotten, { data: userData }] = await Promise.all([
          suggestionsApi.refresh(weatherTemp, weatherDesc, occasion),
          garmentsApi.getForgotten(),
          supabase.auth.getUser(),
        ]);

        const firstName = extractFirstName(userData?.user?.email ?? '');

        setState((s) => ({
          ...s,
          suggestionId: null,
          outfitId: result.outfitId,
          garments: result.garments,
          explanation: result.explanation,
          occasion: result.occasion,
          weatherTemp: result.weatherContext.temp_c,
          weatherDesc: result.weatherContext.condition,
          score: result.score,
          forgottenItems: forgotten,
          alternatives: [],
          alternativesLoading: true,
          status: 'success',
          error: null,
          userFirstName: firstName,
        }));

        loadAlternatives(result.weatherContext.temp_c, result.weatherContext.condition);
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not generate outfit',
        }));
      }
    },
    []
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const loveIt = useCallback(async () => {
    const { outfitId } = state;
    if (!outfitId) return;
    await outfitsApi.rate(outfitId, 'loved');
  }, [state.outfitId]);

  const wearIt = useCallback(async () => {
    const { outfitId, garments, occasion, suggestionId } = state;
    if (garments.length === 0) return;

    await wearLogsApi.create({
      outfit_id: outfitId ?? undefined,
      garment_ids: garments.map((g) => g.id),
      worn_date: new Date().toISOString().slice(0, 10),
      occasion,
    });

    if (suggestionId) {
      await suggestionsApi.actOn(suggestionId);
    }
  }, [state]);

  return { state, loadToday, refresh, loveIt, wearIt };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchGarmentsByIds(ids: string[]): Promise<GarmentItem[]> {
  const { data } = await supabase.from('garments').select('*').in('id', ids);
  return (data ?? []) as GarmentItem[];
}

function extractFirstName(email: string): string {
  const local = email.split('@')[0] ?? '';
  const part = local.split(/[._-]/)[0] ?? '';
  return part.charAt(0).toUpperCase() + part.slice(1);
}
