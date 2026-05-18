import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Storefront } from '@phosphor-icons/react';
import TrimitLogo from '../../brand/TrimitLogo';
import { explorePath } from '../../../config/jammu';

export default function FinalCtaSection() {
  return (
    <section className="py-20 sm:py-24 px-4 bg-orange-800">
      <div className="max-w-4xl mx-auto text-center">
        <TrimitLogo
          variant="icon"
          asLink={false}
          tone="dark"
          iconClassName="h-14 w-14 mx-auto mb-6"
          showWordmark={false}
        />
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Ready for your next salon visit?
        </h2>
        <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
          Join customers and owners across Jammu who book smarter with TrimiT.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={explorePath()}
            data-testid="cta-get-started"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-800 rounded-full font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg"
          >
            Find salons in Jammu
            <ArrowRight size={24} weight="bold" />
          </Link>
          <Link
            to="/signup?role=owner"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white border border-white/30 hover:bg-white/10"
          >
            <Storefront size={22} />
            List your salon free
          </Link>
        </div>
      </div>
    </section>
  );
}
