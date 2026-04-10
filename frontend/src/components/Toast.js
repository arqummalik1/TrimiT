import React from 'react';
import { AnimatePresence } from 'framer-motion';
import ToastItem from './ToastItem';
import { useToastStore } from '../store/toastStore';

const Toast = () => {
  const { toasts, clearAll } = useToastStore();
  
  // Group toasts by position
  const groupedToasts = toasts.reduce((acc, toast) => {
    const position = toast.position || 'top-right';
    if (!acc[position]) acc[position] = [];
    acc[position].push(toast);
    return acc;
  }, {});
  
  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };
  
  return (
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-[9999] flex flex-col gap-2 ${positionStyles[position]} pointer-events-none`}
        >
          <AnimatePresence mode="popLayout">
            {positionToasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastItem toast={toast} />
              </div>
            ))}
          </AnimatePresence>
          
          {/* Clear all button if multiple toasts */}
          {positionToasts.length > 2 && (
            <button
              onClick={clearAll}
              className="mx-auto px-3 py-1 bg-stone-800 text-white text-xs rounded-full opacity-70 hover:opacity-100 transition-opacity"
            >
              Clear all ({positionToasts.length})
            </button>
          )}
        </div>
      ))}
    </>
  );
};

export default Toast;
