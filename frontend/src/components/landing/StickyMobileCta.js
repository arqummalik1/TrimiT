import React from 'react';
import { Link } from 'react-router-dom';
import { Storefront, MagnifyingGlass } from '@phosphor-icons/react';
import { explorePath } from '../../config/jammu';

export default function StickyMobileCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-xl border-t border-stone-200 shadow-lg">
      <div className="flex gap-2 max-w-lg mx-auto">
        <Link
          to={explorePath()}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-orange-800 text-white font-semibold text-sm"
        >
          <MagnifyingGlass size={18} weight="bold" />
          Find businesses
        </Link>
        <Link
          to="/signup?role=owner"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full border border-stone-200 text-stone-800 font-semibold text-sm"
        >
          <Storefront size={18} />
          List business
        </Link>
      </div>
    </div>
  );
}
