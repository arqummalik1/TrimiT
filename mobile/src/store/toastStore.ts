import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',
  show: (message, type = 'info') => {
    set({ visible: true, message, type });
  },
  hide: () => {
    set({ visible: false });
  },
}));

// Convenience function for use outside of React components
export const showToast = (message: string, type?: ToastType) => {
  useToastStore.getState().show(message, type);
};
