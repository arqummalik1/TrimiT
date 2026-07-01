import React from 'react';
import { MapPin } from '@phosphor-icons/react';

/**
 * Transparent, always-visible notice that TrimiT currently serves Jammu only.
 * Shown on discovery pages so users understand that "no salons near me" is
 * about coverage, not a bug or their fault.
 */
export default function ServiceCityNotice({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-900 ${className}`}
    >
      <MapPin size={16} weight="fill" className="text-orange-700 shrink-0" />
      <span>
        TrimiT is currently available in <strong>Jammu</strong> only. More cities coming soon.
      </span>
    </div>
  );
}
