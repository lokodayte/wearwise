import { create } from 'zustand';

export interface QuizAnswers {
  style: string[];        // Q1 — style archetypes
  colors: string[];       // Q2 — preferred colours
  adventurousness: number; // Q3 — 1-5 scale
  occasions: string[];    // Q4 — occasion types
  goal: string;           // Q5 — main goal
}

interface QuizState {
  answers: Partial<QuizAnswers>;
  completed: boolean;
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void;
  markCompleted: () => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  answers: {},
  completed: false,

  setAnswer: (key, value) =>
    set((s) => ({ answers: { ...s.answers, [key]: value } })),

  markCompleted: () => set({ completed: true }),

  reset: () => set({ answers: {}, completed: false }),
}));
