import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore } from '../../src/store/toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  it('initializes with empty toasts', () => {
    const state = useToastStore.getState();
    expect(state.toasts).toEqual([]);
  });

  it('addToast adds a toast and returns an id', () => {
    const store = useToastStore.getState();
    const id = store.addToast('Test message', { type: 'success' });
    
    expect(typeof id).toBe('string');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      id,
      message: 'Test message',
      type: 'success',
      duration: 4000,
    });
  });

  it('auto-removes toast after duration', () => {
    const store = useToastStore.getState();
    store.addToast('Temp message', { duration: 1000 });
    
    expect(useToastStore.getState().toasts).toHaveLength(1);
    
    // Advance timers
    vi.advanceTimersByTime(1000);
    
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('persistent toasts are not auto-removed', () => {
    const store = useToastStore.getState();
    store.addToast('Persistent message', { persistent: true, duration: 1000 });
    
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(2000); // well past duration
    
    expect(useToastStore.getState().toasts).toHaveLength(1); // Still there
  });

  it('convenience methods work properly', () => {
    const store = useToastStore.getState();
    
    store.success('Success');
    store.error('Error'); // Error defaults to duration 0
    store.info('Info');
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    
    expect(toasts[0].type).toBe('success');
    expect(toasts[1].type).toBe('error');
    expect(toasts[1].duration).toBe(0); // special case for errors
    expect(toasts[2].type).toBe('info');
  });

  it('clearAll removes all toasts', () => {
    const store = useToastStore.getState();
    store.addToast('1');
    store.addToast('2');
    
    expect(useToastStore.getState().toasts).toHaveLength(2);
    
    store.clearAll();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
