/**
 * toastStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global toast state with FIFO queue support.
 *
 * Problem: When multiple rapid errors occur (e.g. 3 mutations failing),
 * the old single-toast store would overwrite each previous message immediately.
 *
 * Solution: A queue of pending toasts. The Toast component displays the first
 * item, and on dismiss, dequeues the next. No message is lost.
 *
 * Queue is capped at MAX_QUEUE_SIZE to prevent flooding.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  /** The currently visible toast (null = nothing showing). */
  current: ToastItem | null;
  /** Pending toasts waiting to be shown. */
  queue: ToastItem[];
  /** Show a toast — enqueued if one is already visible. */
  show: (message: string, type?: ToastType) => void;
  /** Dismiss the current toast and show the next in queue. */
  dismiss: () => void;
  /** Clear all queued toasts and hide current. */
  clearAll: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_QUEUE_SIZE = 5;

let _toastIdCounter = 0;
const nextId = () => `toast_${++_toastIdCounter}_${Date.now()}`;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  queue: [],

  show: (message: string, type: ToastType = 'info') => {
    const item: ToastItem = { id: nextId(), message, type };
    const { current, queue } = get();

    if (!current) {
      // Nothing showing — display immediately
      set({ current: item });
    } else if (queue.length < MAX_QUEUE_SIZE) {
      // Enqueue (don't flood the user with stale messages)
      set({ queue: [...queue, item] });
    }
    // If queue is full, silently drop the new toast (oldest messages take priority)
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },

  clearAll: () => {
    set({ current: null, queue: [] });
  },
}));

// ─── Imperative helpers (for use outside React components) ────────────────────

/**
 * Show a toast from anywhere — stores, interceptors, non-React code.
 */
export const showToast = (message: string, type: ToastType = 'info'): void => {
  useToastStore.getState().show(message, type);
};

export const dismissToast = (): void => {
  useToastStore.getState().dismiss();
};

export const clearAllToasts = (): void => {
  useToastStore.getState().clearAll();
};
