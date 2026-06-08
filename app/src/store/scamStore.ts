import { create } from 'zustand';
import type { CheckResponse } from '@wearwise/shared';

interface ScamStore {
  lastResult: CheckResponse | null;
  setLastResult: (result: CheckResponse | null) => void;
}

export const useScamStore = create<ScamStore>((set) => ({
  lastResult: null,
  setLastResult: (result) => set({ lastResult: result }),
}));
