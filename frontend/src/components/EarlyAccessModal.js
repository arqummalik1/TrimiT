import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, EnvelopeSimple, Sparkle, CheckCircle, Spinner } from '@phosphor-icons/react';
import useEarlyAccessViewModel from '../hooks/useEarlyAccessViewModel';

/**
 * Early Access Modal.
 * Prompts user for email and registers them for early access.
 */
export function EarlyAccessModal({ isOpen, onClose }) {
  const { register, isPending, isSuccess, error, reset } = useEarlyAccessViewModel();
  const [email, setEmail] = useState('');
  const [inputError, setInputError] = useState('');

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset ViewModel state on modal close or open
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setInputError('');
      reset();
    }
  }, [isOpen, reset]);

  const validateEmail = (val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Email is required';
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(trimmed)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (inputError) {
      setInputError(validateEmail(val));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setInputError(err);
      return;
    }
    register(email.trim());
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop blur with fading animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal card with sliding/scaling animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200/80 z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="early-access-title"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-800/20"
              aria-label="Close modal"
            >
              <X size={20} weight="bold" />
            </button>

            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="form-container"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Decorative Icon */}
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-800">
                    <Sparkle size={26} weight="duotone" className="animate-pulse" />
                  </div>

                  {/* Header Title */}
                  <h2
                    id="early-access-title"
                    className="font-heading text-2xl font-bold tracking-tight text-stone-900 mb-2"
                  >
                    Early Access Only
                  </h2>
                  
                  {/* Subtext description */}
                  <p className="text-sm leading-relaxed text-stone-500 mb-6">
                    The TrimiT app is currently in early access. Enter your email below to request access, and we will email you the download link directly as soon as your slot is ready!
                  </p>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Error Alerts */}
                    {(error || inputError) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-3.5 rounded-xl text-sm bg-red-50 border border-red-100 text-red-700 leading-relaxed font-medium"
                        role="alert"
                      >
                        {inputError || error}
                      </motion.div>
                    )}

                    <div className="relative">
                      <EnvelopeSimple
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        disabled={isPending}
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl bg-stone-50/50 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 focus:bg-white transition-all disabled:opacity-50"
                        required
                        aria-label="Email address"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-semibold shadow-md shadow-orange-800/10 hover:shadow-lg hover:shadow-orange-800/15 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? (
                        <>
                          <Spinner size={18} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Request Invite</span>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success-container"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', duration: 0.3 }}
                  className="text-center py-4"
                >
                  {/* Success Icon */}
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle size={42} weight="fill" />
                  </div>

                  {/* Success Header */}
                  <h2 className="font-heading text-2xl font-bold text-stone-900 mb-2">
                    You&apos;re on the list!
                  </h2>

                  {/* Success Body */}
                  <p className="text-sm leading-relaxed text-stone-500 mb-6 px-2">
                    Thank you for your interest! We have registered <strong>{email.trim().toLowerCase()}</strong>. As soon as the early access build is ready for your device, we will send the download link straight to your inbox.
                  </p>

                  {/* Success Confirmation button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 active:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-800/10"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default EarlyAccessModal;
