import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Warning, 
  Info,
  Bell,
  X 
} from '@phosphor-icons/react';
import { useToastStore } from '../store/toastStore';

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    progressColor: 'bg-emerald-500'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    progressColor: 'bg-red-500'
  },
  warning: {
    icon: Warning,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    progressColor: 'bg-amber-500'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    progressColor: 'bg-blue-500'
  },
  'new-booking': {
    icon: Bell,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    progressColor: 'bg-purple-500'
  }
};

const ToastItem = ({ toast }) => {
  const { removeToast } = useToastStore();
  const config = toastConfig[toast.type] || toastConfig.info;
  const Icon = config.icon;
  
  const handleAction = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (action.closeOnClick !== false) {
      removeToast(toast.id);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative w-full max-w-sm ${config.bgColor} border ${config.borderColor} rounded-2xl shadow-lg overflow-hidden`}
    >
      {/* Progress bar */}
      {toast.duration > 0 && !toast.persistent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: toast.duration / 1000, ease: 'linear' }}
            className={`h-full ${config.progressColor}`}
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon size={24} weight="fill" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <h4 className="font-semibold text-stone-900 text-sm mb-1">
                {toast.title}
              </h4>
            )}
            <p className="text-stone-700 text-sm leading-relaxed">
              {toast.message}
            </p>
            
            {/* Actions */}
            {toast.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {toast.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      action.primary
                        ? 'bg-orange-800 text-white hover:bg-orange-900'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-full hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ToastItem;
