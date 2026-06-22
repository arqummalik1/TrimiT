/**
 * Unit tests for src/store/toastStore.ts
 * Covers: show, dismiss, clearAll, FIFO queue behavior,
 *         queue size cap, imperative helpers
 */
import { useToastStore, showToast, dismissToast, clearAllToasts } from '../../src/store/toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().clearAll();
  });

  // ─── Initial state ────────────────────────────────────────────────────────
  it('starts with null current and empty queue', () => {
    const { current, queue } = useToastStore.getState();
    expect(current).toBeNull();
    expect(queue).toEqual([]);
  });

  // ─── show (nothing visible) ────────────────────────────────────────────────
  it('shows a toast immediately when nothing is visible', () => {
    useToastStore.getState().show('Hello', 'info');

    const { current } = useToastStore.getState();
    expect(current).not.toBeNull();
    expect(current!.message).toBe('Hello');
    expect(current!.type).toBe('info');
  });

  it('generates a unique id for each toast', () => {
    useToastStore.getState().show('A');
    const idA = useToastStore.getState().current!.id;

    useToastStore.getState().clearAll();
    useToastStore.getState().show('B');
    const idB = useToastStore.getState().current!.id;

    expect(idA).not.toBe(idB);
  });

  // ─── show (something already visible → enqueue) ───────────────────────────
  it('enqueues a second toast when one is already visible', () => {
    useToastStore.getState().show('First', 'info');
    useToastStore.getState().show('Second', 'error');

    const { current, queue } = useToastStore.getState();
    expect(current!.message).toBe('First');
    expect(queue).toHaveLength(1);
    expect(queue[0].message).toBe('Second');
  });

  // ─── Queue size cap (MAX_QUEUE_SIZE = 5) ───────────────────────────────────
  it('caps the queue at 5 items and drops extras', () => {
    // Show one (visible), then 5 more (queue = 5, at cap)
    useToastStore.getState().show('visible');
    for (let i = 0; i < 6; i++) {
      useToastStore.getState().show(`queued-${i}`);
    }

    const { queue } = useToastStore.getState();
    // Queue should be at most 5 — the 6th enqueue is dropped
    expect(queue.length).toBeLessThanOrEqual(5);
    // First enqueued item should be preserved
    expect(queue[0].message).toBe('queued-0');
  });

  // ─── dismiss ──────────────────────────────────────────────────────────────
  it('dismisses current toast and promotes next from queue', () => {
    useToastStore.getState().show('First');
    useToastStore.getState().show('Second');
    useToastStore.getState().show('Third');

    useToastStore.getState().dismiss();

    const { current, queue } = useToastStore.getState();
    expect(current!.message).toBe('Second');
    expect(queue).toHaveLength(1);
    expect(queue[0].message).toBe('Third');
  });

  it('sets current to null when dismissing with empty queue', () => {
    useToastStore.getState().show('Only');

    useToastStore.getState().dismiss();

    const { current, queue } = useToastStore.getState();
    expect(current).toBeNull();
    expect(queue).toEqual([]);
  });

  it('processes entire queue sequentially', () => {
    useToastStore.getState().show('A');
    useToastStore.getState().show('B');
    useToastStore.getState().show('C');

    useToastStore.getState().dismiss(); // current → B
    expect(useToastStore.getState().current!.message).toBe('B');

    useToastStore.getState().dismiss(); // current → C
    expect(useToastStore.getState().current!.message).toBe('C');

    useToastStore.getState().dismiss(); // current → null
    expect(useToastStore.getState().current).toBeNull();
  });

  // ─── clearAll ────────────────────────────────────────────────────────────
  it('clears current and all queued toasts', () => {
    useToastStore.getState().show('A');
    useToastStore.getState().show('B');
    useToastStore.getState().show('C');

    useToastStore.getState().clearAll();

    const { current, queue } = useToastStore.getState();
    expect(current).toBeNull();
    expect(queue).toEqual([]);
  });

  // ─── Default type ─────────────────────────────────────────────────────────
  it('defaults to "info" type when not specified', () => {
    useToastStore.getState().show('Hello');
    expect(useToastStore.getState().current!.type).toBe('info');
  });

  // ─── All toast types ──────────────────────────────────────────────────────
  it.each(['success', 'error', 'info', 'warning'] as const)(
    'shows a "%s" toast correctly',
    (type) => {
      useToastStore.getState().clearAll();
      useToastStore.getState().show('msg', type);
      expect(useToastStore.getState().current!.type).toBe(type);
    },
  );
});

// ─── Imperative helpers (outside React) ──────────────────────────────────────

describe('imperative toast helpers', () => {
  beforeEach(() => {
    clearAllToasts();
  });

  it('showToast displays a toast', () => {
    showToast('imperative message', 'success');
    expect(useToastStore.getState().current!.message).toBe('imperative message');
    expect(useToastStore.getState().current!.type).toBe('success');
  });

  it('dismissToast dismisses the current toast', () => {
    showToast('msg');
    dismissToast();
    expect(useToastStore.getState().current).toBeNull();
  });

  it('clearAllToasts clears everything', () => {
    showToast('msg');
    showToast('msg2');
    clearAllToasts();
    expect(useToastStore.getState().current).toBeNull();
    expect(useToastStore.getState().queue).toEqual([]);
  });
});
