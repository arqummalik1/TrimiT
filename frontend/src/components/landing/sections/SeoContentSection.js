import React from 'react';
import { Link } from 'react-router-dom';
import { explorePath } from '../../../config/jammu';

export default function SeoContentSection() {
  return (
    <section className="py-16 px-4 bg-stone-50 border-t border-stone-200">
      <article className="max-w-3xl mx-auto prose prose-stone">
        <h2 className="font-heading text-2xl font-bold text-stone-900 mb-4">
          Salon & Saloon booking in Jammu — book online with TrimiT
        </h2>
        <p className="text-stone-600 leading-relaxed mb-4">
          TrimiT is a premium salon and saloon marketplace built for Jammu and Kashmir. Whether you need a
          quick haircut in Jammu, beard grooming at a gents saloon near Trikuta Nagar, or a relaxing spa day, our
          platform connects you with top-rated salons and hair saloons offering live slot availability and instant
          appointment confirmation. Search salon/saloon near me in Jammu, compare services and reviews,
          and book beauty services or online saloon bookings in Jammu without phone calls.
        </p>
        <p className="text-stone-600 leading-relaxed mb-4">
          For salon and saloon owners, TrimiT is the easiest way to take your business online — list your salon
          or saloon for free, manage your booking calendar, and get discovered by customers searching for
          online saloon booking in Jammu. From men&apos;s hair saloons to women&apos;s beauty
          parlours, bridal salons, and makeup artists, TrimiT supports the full grooming ecosystem in Jammu.
        </p>
        <p className="text-stone-600 leading-relaxed">
          Ready to book?{' '}
          <Link to={explorePath()} className="text-orange-800 font-semibold hover:underline">
            Browse salons & saloons in Jammu
          </Link>{' '}
          or explore our guides for{' '}
          <Link to="/best-haircut-in-jammu" className="text-orange-800 font-semibold hover:underline">
            haircuts & saloons
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
