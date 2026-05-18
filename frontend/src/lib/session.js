/** Shared auth session helpers (no axios import — safe from api interceptors). */
export const AUTH_STORAGE_KEY = 'trimit-auth';

export function clearPersistedAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
