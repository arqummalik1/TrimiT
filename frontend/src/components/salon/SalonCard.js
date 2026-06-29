import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Clock, NavigationArrow, Prohibit } from '@phosphor-icons/react';
import { formatPrice } from '../../lib/utils';
import { ENABLE_SUBSCRIPTION_ENFORCEMENT } from '../../lib/featureFlags';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1626383137804-ff908d2753a2?auto=format&fit=crop&w=800&q=72';

export default function SalonCard({ salon, compact = false }) {
  const lowestPrice =
    salon.services?.length > 0 ? Math.min(...salon.services.map((s) => s.price)) : null;
  const distance = salon.distance ?? salon.distance_km;

  // Lapsed salon (owner subscription inactive) — greyed out, not bookable.
  const unavailable =
    ENABLE_SUBSCRIPTION_ENFORCEMENT && salon.subscription_active === false;

  const cardInner = (
    <>
      <motion.div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={salon.images?.[0] || salon.image_url || DEFAULT_IMAGE}
          alt={salon.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            unavailable ? 'grayscale opacity-60' : 'hover:scale-105'
          }`}
          loading="lazy"
        />
        {unavailable ? (
          <div className="absolute top-3 left-3 bg-stone-800/85 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold">
            <Prohibit size={14} weight="bold" />
            Currently unavailable
          </div>
        ) : (
          distance != null && (
            <motion.div
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium text-stone-700"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <NavigationArrow size={14} weight="bold" />
              {distance} km
            </motion.div>
          )
        )}
      </motion.div>
      <div className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-heading text-lg font-bold text-stone-900 line-clamp-1">
            {salon.name}
          </h3>
          {salon.avg_rating > 0 && (
            <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-lg shrink-0">
              <Star size={14} weight="fill" className="text-emerald-700" />
              <span className="text-sm font-semibold text-emerald-800">{salon.avg_rating}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-3">
          <MapPin size={16} weight="bold" />
          <span className="line-clamp-1">
            {salon.address}
            {salon.city ? `, ${salon.city}` : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {salon.opening_time && (
            <motion.div className="flex items-center gap-1.5 text-stone-500 text-sm">
              <Clock size={16} weight="bold" />
              <span>
                {salon.opening_time} - {salon.closing_time}
              </span>
            </motion.div>
          )}
          {unavailable ? (
            <span className="text-stone-400 font-semibold text-sm shrink-0">Unavailable</span>
          ) : (
            lowestPrice != null && (
              <span className="text-orange-800 font-semibold text-sm shrink-0">
                From {formatPrice(lowestPrice)}
              </span>
            )
          )}
        </div>
      </div>
    </>
  );

  if (unavailable) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
      >
        <div
          data-testid={`salon-card-${salon.id}`}
          aria-disabled="true"
          title="Currently unavailable"
          className="block bg-white rounded-2xl overflow-hidden border border-stone-200 cursor-not-allowed"
        >
          {cardInner}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to={`/salon/${salon.id}`}
        data-testid={`salon-card-${salon.id}`}
        className="block bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-xl transition-all duration-300"
      >
        {cardInner}
      </Link>
    </motion.div>
  );
}
