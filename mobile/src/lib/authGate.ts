import {
  NewPendingAuthIntent,
  usePendingAuthIntentStore,
} from '../store/pendingAuthIntentStore';

/** Open authentication without discarding the guest's current navigation state. */
export function requestAuthentication(intent: NewPendingAuthIntent): void {
  usePendingAuthIntentStore.getState().setIntent(intent);
  // Lazy import keeps screen modules independent from the NavigationContainer
  // during unit tests and avoids a circular import through the root navigator.
  const { navigationRef } = require('../navigation/navigationRef') as typeof import('../navigation/navigationRef');
  if (navigationRef.isReady()) {
    navigationRef.navigate('Auth', { screen: 'Login' });
  }
}

/** Activate an owner workspace for a user who is already authenticated. */
export function requestOwnerWorkspace(): void {
  usePendingAuthIntentStore.getState().setIntent({ kind: 'owner_onboarding' });
}

/** Start invite validation for an already-authenticated employee. */
export function requestEmployeeWorkspace(): void {
  usePendingAuthIntentStore.getState().setIntent({ kind: 'employee_claim' });
  const { navigationRef } = require('../navigation/navigationRef') as typeof import('../navigation/navigationRef');
  if (navigationRef.isReady()) {
    navigationRef.navigate('CompleteProfile', { prefilledRole: 'employee' });
  }
}
