import { useState, useCallback } from 'react';
import {
  suggestionsApi,
  garmentsApi,
  outfitsApi,
  wearLogsApi,
  type OutfitEngineResult,
  type GarmentItem,
  type DailySuggestionWithOutfit,
} from '../services/api';

export type OutfitStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

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
  status: 'idle',
  error: null,
  userFirstName: '',
};

export function useOutfitSuggestion() {
  const [state, setState] = useState<SuggestionState>(INITIAL);

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
        // No suggestion yet for today — request one
        await refresh(true);
        return;
      }

      const garments = suggestion.outfits.garment_ids
        ? await fetchGarmentsByIds(suggestion.outfits.garment_ids)
        : [];

      setState({
        suggestionId: suggestion.id,
        outfitId: suggestion.outfit_id,
        garments,
        explanation: suggestion.outfits.ai_explanation ?? '',
        occasion: suggestion.outfits.occasion ?? 'Today',
        weatherTemp: suggestion.weather_snapshot?.temp_c ?? null,
        weatherDesc: suggestion.weather_snapshot?.condition ?? '',
        score: suggestion.score,
        forgottenItems: forgotten,
        status: 'success',
        error: null,
        userFirstName: firstName,
      });
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
    async (silent = false, weatherTemp = 18, weatherDesc = 'clear', occasion = 'casual day') => {
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
          status: 'success',
          error: null,
          userFirstName: firstName,
        }));
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

import { supabase } from '../services/supabase';

async function fetchGarmentsByIds(ids: string[]) {
  const { data } = await supabase.from('garments').select('*').in('id', ids);
  return (data ?? []) as GarmentItem[];
}

function extractFirstName(email: string): string {
  // Attempt to derive a friendly name from e.g. "john.doe@..." → "John"
  const local = email.split('@')[0] ?? '';
  const part = local.split(/[._-]/)[0] ?? '';
  return part.charAt(0).toUpperCase() + part.slice(1);
}
