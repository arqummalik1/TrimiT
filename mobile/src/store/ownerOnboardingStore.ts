import { create } from 'zustand';

interface OwnerOnboardingState {
  /** After first salon create — guide owner to add services. */
  postSalonCreatePending: boolean;
  setPostSalonCreatePending: (value: boolean) => void;
  consumePostSalonCreate: () => boolean;
}

export const useOwnerOnboardingStore = create<OwnerOnboardingState>((set, get) => ({
  postSalonCreatePending: false,
  setPostSalonCreatePending: (value) => set({ postSalonCreatePending: value }),
  consumePostSalonCreate: () => {
    const pending = get().postSalonCreatePending;
    if (pending) {
      set({ postSalonCreatePending: false });
    }
    return pending;
  },
}));
