import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import SalonCard from '../../salon/SalonCard';
import { usePublicSalons, sortSalonsByRating } from '../../../hooks/usePublicSalons';
import { explorePath } from '../../../config/jammu';

export default function FeaturedSalonsSection({
  title = 'Top rated in Jammu',
  subtitle = 'Verified salons with live slots — book in minutes.',
  limit = 6,
  sort = 'rating',
}) {
  const { data: salons, isLoading } = usePublicSalons({ limit: 12 });
  const list =
    sort === 'rating' ? sortSalonsByRating(salons).slice(0, limit) : (salons || []).slice(0, limit);

  return (
    <section className="py-16 sm:py-20 px-4 bg-white mt-8" aria-labelledby="featured-salons-heading">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
              Featured
            </span>
            <h2 id="featured-salons-heading" className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mt-2">
              {title}
            </h2>
            <p className="text-stone-500 mt-2 max-w-xl">{subtitle}</p>
          </div>
          <Link
            to={explorePath()}
            className="inline-flex items-center gap-2 text-orange-800 font-semibold hover:text-orange-900"
          >
            View all salons
            <ArrowRight size={18} weight="bold" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-stone-200 animate-pulse" />
            ))}
          </div>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        ) : (
          <p className="text-center text-stone-500 py-12">
            Salons in Jammu are joining TrimiT.{' '}
            <Link to="/signup?role=owner" className="text-orange-800 font-semibold">
              List yours first
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
