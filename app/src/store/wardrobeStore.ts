import { create } from 'zustand';
import type { Garment, Outfit, DailySuggestion } from '@wearwise/shared';

interface WardrobeState {
  garments: Garment[];
  outfits: Outfit[];
  todaySuggestion: DailySuggestion | null;
  isLoading: boolean;
  setGarments: (garments: Garment[]) => void;
  addGarment: (garment: Garment) => void;
  removeGarment: (id: string) => void;
  setOutfits: (outfits: Outfit[]) => void;
  setTodaySuggestion: (suggestion: DailySuggestion | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useWardrobeStore = create<WardrobeState>((set) => ({
  garments: [],
  outfits: [],
  todaySuggestion: null,
  isLoading: false,

  setGarments: (garments) => set({ garments }),

  addGarment: (garment) =>
    set((state) => ({ garments: [garment, ...state.garments] })),

  removeGarment: (id) =>
    set((state) => ({ garments: state.garments.filter((g) => g.id !== id) })),

  setOutfits: (outfits) => set({ outfits }),

  setTodaySuggestion: (todaySuggestion) => set({ todaySuggestion }),

  setLoading: (isLoading) => set({ isLoading }),
}));
