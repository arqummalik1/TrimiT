import React from 'react';
import { Star, CalendarCheck, Clock, MapPin } from '@phosphor-icons/react';
import AnimatedCounter from '../AnimatedCounter';

const ITEMS = [
  {
    icon: Star,
    value: <AnimatedCounter end={4.9} decimals={1} suffix="★" className="font-heading text-2xl sm:text-3xl font-bold text-orange-800" />,
    label: 'Average customer rating',
  },
  {
    icon: CalendarCheck,
    value: <AnimatedCounter end={1000} suffix="+" className="font-heading text-2xl sm:text-3xl font-bold text-orange-800" />,
    label: 'Appointments booked',
  },
  {
    icon: Clock,
    value: <span className="font-heading text-2xl sm:text-3xl font-bold text-orange-800">24/7</span>,
    label: 'Book anytime online',
  },
  {
    icon: MapPin,
    value: <span className="font-heading text-2xl sm:text-3xl font-bold text-orange-800">Jammu</span>,
    label: 'Salons & parlours',
  },
];

export default function TrustStripSection() {
  return (
    <section className="relative z-20 -mt-10 mx-4 sm:mx-6 lg:mx-8 max-w-6xl lg:mx-auto" aria-label="Trust metrics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-white rounded-2xl shadow-xl shadow-stone-900/8 border border-stone-200/80 p-5 sm:p-8">
        {ITEMS.map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="text-center sm:text-left sm:px-3 lg:border-r lg:border-stone-100 last:border-0"
          >
            <Icon size={22} weight="duotone" className="text-orange-700 mx-auto sm:mx-0 mb-2" />
            <div>{value}</div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
