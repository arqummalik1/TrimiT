/**
 * pendingSignupStore.ts
 *
 * Holds the name + phone the user typed on the signup form so we can PATCH
 * the profile right after OTP verification. We don't depend on Supabase
 * round-tripping `options.data` through `auth/v1/otp` → `auth/v1/verify`,
 * which is unreliable across SDK versions.
 *
 * Lives in memory only — no persistence — and is cleared after consumption.
 */

import { create } from 'zustand';

interface PendingSignup {
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'owner';
}

interface PendingSignupState {
  pending: PendingSignup | null;
  setPendingSignup: (data: PendingSignup) => void;
  consumePendingSignup: (email: string) => PendingSignup | null;
  clearPendingSignup: () => void;
}

export const usePendingSignupStore = create<PendingSignupState>((set, get) => ({
  pending: null,
  setPendingSignup: (data) => set({ pending: data }),
  consumePendingSignup: (email) => {
    const current = get().pending;
    if (!current) return null;
    if (current.email.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
    set({ pending: null });
    return current;
  },
  clearPendingSignup: () => set({ pending: null }),
}));
