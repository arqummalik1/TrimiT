import React from 'react';
import { motion } from 'framer-motion';

export default function BentoFeatureCard({ icon: Icon, title, description, accent, index = 0 }) {
  return (
    <motion.div
      className={`group rounded-2xl border border-stone-200/80 p-6 sm:p-7 bg-gradient-to-br ${accent} hover:shadow-xl transition-shadow duration-300`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <motion.div
        className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 ring-1 ring-stone-200/60 group-hover:ring-orange-200"
        whileHover={{ rotate: [0, -4, 4, 0] }}
        transition={{ duration: 0.4 }}
      >
        <Icon size={26} weight="duotone" className="text-orange-800" />
      </motion.div>
      <h3 className="font-heading text-base font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
