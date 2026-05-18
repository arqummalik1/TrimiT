import React from 'react';
import { Link } from 'react-router-dom';
import { formatCopyright, formatVersionLine } from '../config/appVersion';

/** Compact version + legal line for account/settings pages. */
export default function AppVersionNote({ className = '' }) {
  return (
    <p className={`text-xs text-stone-500 text-center ${className}`.trim()}>
      {formatVersionLine()}
      <span className="block mt-1">{formatCopyright()}</span>
      <span className="block mt-2">
        <Link to="/terms" className="text-orange-800 hover:underline">
          Terms & Conditions
        </Link>
        {' · '}
        <Link to="/privacy" className="text-orange-800 hover:underline">
          Privacy Policy
        </Link>
      </span>
    </p>
  );
}
