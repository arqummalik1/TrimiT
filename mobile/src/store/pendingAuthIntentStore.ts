import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const INTENT_TTL_MS = 20 * 60 * 1000;

type IntentMeta = {
  createdAt: number;
  expiresAt: number;
};

export type PendingAuthIntent =
  | (IntentMeta & { kind: 'customer_booking'; salonId: string; serviceId: string })
  | (IntentMeta & { kind: 'my_bookings' })
  | (IntentMeta & {
      kind: 'reschedule_booking';
      bookingId: string;
      currentDate: string;
      currentSlot: string;
      salonId: string;
      serviceId: string;
      salonName: string;
      serviceName: string;
    })
  | (IntentMeta & { kind: 'write_review'; salonId: string; bookingId: string })
  | (IntentMeta & { kind: 'account_sign_in' })
  | (IntentMeta & { kind: 'profile' })
  | (IntentMeta & { kind: 'owner_onboarding' })
  | (IntentMeta & { kind: 'employee_claim' });

type WithoutIntentMeta<T> = T extends unknown ? Omit<T, keyof IntentMeta> : never;
export type NewPendingAuthIntent = WithoutIntentMeta<PendingAuthIntent>;

interface PendingAuthIntentState {
  intent: PendingAuthIntent | null;
  isHydrated: boolean;
  setIntent: (intent: NewPendingAuthIntent) => void;
  peekIntent: () => PendingAuthIntent | null;
  consumeIntent: () => PendingAuthIntent | null;
  clearIntent: () => void;
  setHydrated: (hydrated: boolean) => void;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** AsyncStorage is outside TypeScript's trust boundary; validate before navigation. */
function isValidStoredIntent(value: unknown): value is PendingAuthIntent {
  if (!value || typeof value !== 'object') return false;
  const intent = value as Record<string, unknown>;
  if (
    typeof intent.createdAt !== 'number'
    || !Number.isFinite(intent.createdAt)
    || typeof intent.expiresAt !== 'number'
    || !Number.isFinite(intent.expiresAt)
    || intent.expiresAt <= intent.createdAt
  ) return false;

  switch (intent.kind) {
    case 'customer_booking':
      return isNonEmptyString(intent.salonId) && isNonEmptyString(intent.serviceId);
    case 'my_bookings':
    case 'account_sign_in':
    case 'profile':
    case 'owner_onboarding':
    case 'employee_claim':
      return true;
    case 'write_review':
      return isNonEmptyString(intent.salonId) && isNonEmptyString(intent.bookingId);
    case 'reschedule_booking':
      return [
        intent.bookingId,
        intent.currentDate,
        intent.currentSlot,
        intent.salonId,
        intent.serviceId,
        intent.salonName,
        intent.serviceName,
      ].every(isNonEmptyString);
    default:
      return false;
  }
}

function isFresh(intent: unknown): intent is PendingAuthIntent {
  return isValidStoredIntent(intent) && intent.expiresAt > Date.now();
}

export const usePendingAuthIntentStore = create<PendingAuthIntentState>()(
  persist(
    (set, get) => ({
      intent: null,
      isHydrated: false,
      setIntent: (next) => {
        const createdAt = Date.now();
        set({
          intent: {
            ...next,
            createdAt,
            expiresAt: createdAt + INTENT_TTL_MS,
          } as PendingAuthIntent,
        });
      },
      peekIntent: () => {
        const current = get().intent;
        if (isFresh(current)) return current;
        if (current) set({ intent: null });
        return null;
      },
      consumeIntent: () => {
        const current = get().intent;
        set({ intent: null });
        return isFresh(current) ? current : null;
      },
      clearIntent: () => set({ intent: null }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'trimit-pending-auth-intent',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ intent: state.intent }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        state?.peekIntent();
      },
    },
  ),
);

export function getRoleForPendingIntent(): 'customer' | 'owner' | 'employee' {
  const intent = usePendingAuthIntentStore.getState().peekIntent();
  if (intent?.kind === 'employee_claim') return 'employee';
  return 'customer';
}
