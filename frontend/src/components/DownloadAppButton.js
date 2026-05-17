import React from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { DOWNLOAD_APP_URL } from '../config/storeLinks';

/**
 * Header CTA with a clockwise “running light” border (conic gradient spin).
 * Link: REACT_APP_DOWNLOAD_APP_URL (default: Google Drive APK folder).
 */
export function DownloadAppButton({ className = '' }) {
  return (
    <a
      href={DOWNLOAD_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="header-download-app"
      aria-label="Download TrimiT app"
      className={`download-app-btn group relative inline-flex shrink-0 ${className}`}
    >
      <span className="download-app-btn__ring" aria-hidden="true" />
      <span className="download-app-btn__inner relative z-10 inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-orange-900 shadow-sm transition-all duration-200 group-hover:bg-orange-50 group-hover:shadow-md">
        <DownloadSimple size={18} weight="bold" className="text-orange-800 shrink-0" />
        <span className="hidden sm:inline">Download App</span>
        <span className="sm:hidden">App</span>
      </span>
    </a>
  );
}

export default DownloadAppButton;
