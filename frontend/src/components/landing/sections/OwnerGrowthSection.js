import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, ChartBar, Bell, Tag, Storefront, Users } from '@phosphor-icons/react';
import DashboardMockup from '../mockups/DashboardMockup';

const FEATURES = [
  { icon: Calendar, text: 'Online bookings & calendar' },
  { icon: Storefront, text: 'Digital salon profile' },
  { icon: Bell, text: 'Customer notifications' },
  { icon: ChartBar, text: 'Booking analytics' },
  { icon: Tag, text: 'Offers & discounts' },
  { icon: Users, text: 'Service management' },
];

export default function OwnerGrowthSection({ compact = false }) {
  return (
    <section
      className={`px-4 ${compact ? 'py-12' : 'py-20 sm:py-24'}`}
      aria-labelledby="owner-growth-heading"
    >
      <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-orange-950 p-8 sm:p-12 lg:p-14 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 90% 20%, #ea580c 0%, transparent 40%)',
          }}
        />
        <div className="relative grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-300">
              For salon owners
            </span>
            <h2
              id="owner-growth-heading"
              className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            >
              Grow your salon business with TrimiT
            </h2>
            <p className="text-stone-300 leading-relaxed mb-6">
              Take your salon online — get discovered by customers nearby, accept appointments 24/7,
              and manage bookings digitally. List your salon for free on India&apos;s modern salon
              booking platform.
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 mb-8">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-stone-200 text-sm">
                  <Icon size={18} weight="duotone" className="text-orange-400 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/signup?role=owner"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-900 rounded-full font-bold hover:bg-orange-50 transition-colors"
              >
                List your salon free
                <ArrowRight size={20} weight="bold" />
              </Link>
              <Link
                to="/for-salons"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white border border-white/25 hover:bg-white/10"
              >
                See owner features
              </Link>
            </div>
          </div>
          <DashboardMockup className="max-w-md mx-auto lg:ml-auto w-full" />
        </div>
      </div>
    </section>
  );
}
