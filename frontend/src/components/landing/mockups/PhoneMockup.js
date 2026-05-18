import React from 'react';
import { motion } from 'framer-motion';

export default function PhoneMockup({ className = '' }) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
    >
      <div className="mx-auto w-[200px] sm:w-[220px] rounded-[2rem] bg-stone-950 border-2 border-stone-600/80 p-2 shadow-2xl shadow-orange-900/30">
        <div className="rounded-[1.5rem] overflow-hidden bg-stone-100 aspect-[9/19]">
          <div className="h-8 bg-orange-800 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white tracking-wide">TrimiT</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="h-16 rounded-xl bg-gradient-to-br from-orange-100 to-amber-50" />
            <div className="h-3 w-3/4 rounded bg-stone-200" />
            <div className="h-3 w-1/2 rounded bg-stone-200" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-14 rounded-lg bg-orange-800/90" />
              <div className="h-14 rounded-lg bg-stone-200" />
            </div>
            <div className="h-8 rounded-full bg-emerald-600 mt-2 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">Book slot</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
