import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from '@phosphor-icons/react';

const SuccessOverlay = ({ isOpen, isNewUser, userName, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-stone-100"
          >
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-800"
              >
                <CheckCircle size={48} weight="fill" />
              </motion.div>
            </div>

            <h3 className="text-2xl font-bold text-stone-950 mb-2 font-heading">
              {isNewUser ? 'Welcome to TrimiT!' : 'Welcome Back!'}
            </h3>
            
            <p className="text-stone-600 mb-6 text-sm">
              {isNewUser 
                ? 'Your account has been created successfully. Let\'s explore!' 
                : `Successfully signed in as ${userName}. Great to have you back!`}
            </p>

            <button
              onClick={onClose}
              className="w-full bg-orange-800 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md shadow-orange-800/10 cursor-pointer focus:outline-none"
            >
              Continue
            </button>
            
            <div className="mt-4 text-xs text-stone-400">
              Closing in a few seconds...
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessOverlay;
