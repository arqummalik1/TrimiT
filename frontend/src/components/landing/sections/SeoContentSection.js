import React from 'react';
import { Link } from 'react-router-dom';
import { explorePath } from '../../../config/jammu';

export default function SeoContentSection() {
  return (
    <section className="py-16 px-4 bg-stone-50 border-t border-stone-200">
      <article className="max-w-3xl mx-auto prose prose-stone">
        <h2 className="font-heading text-2xl font-bold text-stone-900 mb-4">
          Salon booking in Jammu — book online with TrimiT
        </h2>
        <p className="text-stone-600 leading-relaxed mb-4">
          TrimiT is a premium salon marketplace built for Jammu and Kashmir. Whether you need a
          quick haircut in Jammu, beard grooming near Trikuta Nagar, or a full spa day, our
          platform connects you with top-rated salons offering live slot availability and instant
          appointment confirmation. Search salon near me in Jammu, compare services and reviews,
          and book beauty services in Jammu without phone calls.
        </p>
        <p className="text-stone-600 leading-relaxed mb-4">
          For salon owners, TrimiT is the easiest way to take your business online — list your salon
          for free, manage your booking calendar, and get discovered by customers searching for
          salon appointment booking in Jammu. From men&apos;s salons to women&apos;s beauty
          parlours and bridal makeup artists, TrimiT supports the full grooming ecosystem in Jammu.
        </p>
        <p className="text-stone-600 leading-relaxed">
          Ready to book?{' '}
          <Link to={explorePath()} className="text-orange-800 font-semibold hover:underline">
            Browse salons in Jammu
          </Link>{' '}
          or explore our guides for{' '}
          <Link to="/best-haircut-in-jammu" className="text-orange-800 font-semibold hover:underline">
            haircuts
          </Link>
          ,{' '}
          <Link to="/spa-services-jammu" className="text-orange-800 font-semibold hover:underline">
            spa services
          </Link>
          , and{' '}
          <Link to="/beauty-parlours-jammu" className="text-orange-800 font-semibold hover:underline">
            beauty parlours
          </Link>
          .
        </p>
      </article>
    </section>
  );
}
