import { create } from 'zustand';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useToastStore = create((set, get) => ({
  toasts: [],
  
  addToast: (message, options = {}) => {
    const id = generateId();
    const {
      type = 'info',
      duration = type === 'error' ? 0 : 4000,
      position = 'top-right',
      title,
      actions = [],
      persistent = false
    } = options;
    
    const toast = {
      id,
      message,
      type,
      title,
      position,
      duration,
      actions,
      persistent,
      createdAt: Date.now()
    };
    
    set((state) => ({
      toasts: [...state.toasts, toast]
    }));
    
    // Auto-remove if duration > 0
    if (duration > 0 && !persistent) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }));
  },
  
  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    }));
  },
  
  clearAll: () => {
    set({ toasts: [] });
  },
  
  // Convenience methods
  success: (message, options = {}) => {
    return get().addToast(message, { ...options, type: 'success' });
  },
  
  error: (message, options = {}) => {
    return get().addToast(message, { ...options, type: 'error' });
  },
  
  warning: (message, options = {}) => {
    return get().addToast(message, { ...options, type: 'warning' });
  },
  
  info: (message, options = {}) => {
    return get().addToast(message, { ...options, type: 'info' });
  },
  
  newBooking: (title, message, options = {}) => {
    return get().addToast(message, {
      ...options,
      type: 'new-booking',
      title,
      persistent: true,
      duration: 0
    });
  }
}));
