import React from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlass, Calendar, CheckCircle } from '@phosphor-icons/react';

const STEPS = [
  { icon: MagnifyingGlass, title: 'Discover', text: 'Browse salons in Jammu' },
  { icon: Calendar, title: 'Pick a slot', text: 'Live availability' },
  { icon: CheckCircle, title: 'Confirm', text: 'Instant booking' },
];

export default function BookingFlowAnimation() {
  return (
    <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0 max-w-3xl mx-auto">
      {STEPS.map((step, i) => (
        <motion.div
          key={step.title}
          className="flex-1 relative flex flex-col items-center text-center px-4"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
        >
          {i < STEPS.length - 1 && (
            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-orange-300 to-orange-500/40" />
          )}
          <motion.div
            className="w-16 h-16 rounded-2xl bg-white border border-stone-200 shadow-lg flex items-center justify-center mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <step.icon size={32} weight="duotone" className="text-orange-800" />
          </motion.div>
          <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
            Step {i + 1}
          </span>
          <h3 className="font-heading font-bold text-stone-900 mt-1">{step.title}</h3>
          <p className="text-sm text-stone-500 mt-1">{step.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
