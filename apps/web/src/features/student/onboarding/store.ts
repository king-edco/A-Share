/** Wizard state: one object, updated step by step, reset on completion. */

import { create } from "zustand";

export interface OnboardingData {
  fullName: string;
  school: string;
  city: string;
  examId: string | null;
  examName: string | null;
  examSystem: "FR" | "EN" | null;
  seriesId: string | null;
  seriesLabel: string | null;
  subjectIds: string[];
  /** Parallel display names for the recap; ids go to the backend. */
  subjectNames: string[];
  phoneNumber: string;
  pin: string;
}

interface OnboardingState {
  data: OnboardingData;
  set: (partial: Partial<OnboardingData>) => void;
  reset: () => void;
}

const initial: OnboardingData = {
  fullName: "",
  school: "",
  city: "",
  examId: null,
  examName: null,
  examSystem: null,
  seriesId: null,
  seriesLabel: null,
  subjectIds: [],
  subjectNames: [],
  phoneNumber: "",
  pin: "",
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  data: initial,
  set: (partial) => set((state) => ({ data: { ...state.data, ...partial } })),
  reset: () => set({ data: initial }),
}));
