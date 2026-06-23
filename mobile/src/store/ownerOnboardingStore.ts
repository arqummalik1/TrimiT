import { create } from 'zustand';

interface OwnerOnboardingState {
  /** After first salon create — guide owner to add services. */
  postSalonCreatePending: boolean;
  setPostSalonCreatePending: (value: boolean) => void;
  consumePostSalonCreate: () => boolean;

  /** After first service create — guide owner to add bank details. */
  bankDetailsPending: boolean;
  setBankDetailsPending: (value: boolean) => void;
  consumeBankDetailsPending: () => boolean;
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

  bankDetailsPending: false,
  setBankDetailsPending: (value) => set({ bankDetailsPending: value }),
  consumeBankDetailsPending: () => {
    const pending = get().bankDetailsPending;
    if (pending) {
      set({ bankDetailsPending: false });
    }
    return pending;
  },
}));
