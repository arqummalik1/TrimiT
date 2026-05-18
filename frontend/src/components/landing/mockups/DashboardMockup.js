import React from 'react';
import { motion } from 'framer-motion';

export default function DashboardMockup({ className = '' }) {
  const bars = [40, 65, 45, 80, 55, 90, 70];

  return (
    <motion.div
      className={`rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <motion.div className="px-4 py-3 border-b border-stone-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-400/80" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 text-xs text-stone-400 font-medium">TrimiT Owner Dashboard</span>
      </motion.div>
      <div className="p-4 grid grid-cols-3 gap-2">
        {['Bookings today', 'Revenue', 'New clients'].map((label, i) => (
          <motion.div
            key={label}
            className="rounded-xl bg-stone-800/80 p-3 border border-stone-700/50"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-white mt-1">
              {i === 0 ? '12' : i === 1 ? '₹8.4k' : '5'}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <p className="text-xs text-stone-500 mb-2">Bookings this week</p>
        <div className="flex items-end gap-1.5 h-24">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-orange-800 to-orange-500"
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.5 }}
            />
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {['Haircut — 2:30 PM', 'Beard trim — 4:00 PM', 'Facial — 5:30 PM'].map((row, i) => (
          <motion.div
            key={row}
            className="flex items-center justify-between rounded-lg bg-stone-800/60 px-3 py-2 text-xs text-stone-300"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            <span>{row}</span>
            <span className="text-emerald-400 font-medium">Confirmed</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
