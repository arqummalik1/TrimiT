import React, { useState, useCallback } from 'react';
import { GooglePlayLogo, AppleLogo, X } from '@phosphor-icons/react';
import { PLAY_STORE_URL, IS_APK_DRIVE_DOWNLOAD } from '../config/storeLinks';
import { PUBLIC_SITE_URL } from '../config/site';

/**
 * Android APK (Drive until Play Store) + App Store coming-soon for footers.
 */
export function StoreDownloadLinks({ variant = 'light' }) {
  const [iosModalOpen, setIosModalOpen] = useState(false);

  const isDark = variant === 'dark';
  const btnBase =
    'inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-800/40';
  const playClass = isDark
    ? `${btnBase} bg-stone-800 border-stone-600 text-white hover:bg-stone-700 hover:border-stone-500`
    : `${btnBase} bg-white border-stone-200 text-stone-900 hover:border-orange-300 hover:shadow-sm`;
  const iosClass = isDark
    ? `${btnBase} bg-stone-800/60 border-stone-600 text-stone-300 hover:bg-stone-700 hover:text-white`
    : `${btnBase} bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900`;

  const labelClass = 'text-left leading-tight';
  const smallClass = `block text-[10px] uppercase tracking-wide ${isDark ? 'text-stone-400' : 'text-stone-500'}`;
  const mainClass = `block text-sm font-semibold ${isDark ? 'text-white' : 'text-stone-900'}`;

  const openIosModal = useCallback(() => setIosModalOpen(true), []);
  const closeIosModal = useCallback(() => setIosModalOpen(false), []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={playClass}
          aria-label={
            IS_APK_DRIVE_DOWNLOAD ? 'Download TrimiT APK' : 'Get TrimiT on Google Play'
          }
          data-testid="footer-download-android"
        >
          <GooglePlayLogo size={28} weight="fill" className={isDark ? 'text-green-400' : 'text-stone-800'} />
          <span className={labelClass}>
            <span className={smallClass}>
              {IS_APK_DRIVE_DOWNLOAD ? 'Download' : 'Get it on'}
            </span>
            <span className={mainClass}>
              {IS_APK_DRIVE_DOWNLOAD ? 'Android APK' : 'Google Play'}
            </span>
          </span>
        </a>

        <button
          type="button"
          onClick={openIosModal}
          className={iosClass}
          aria-label="TrimiT on the App Store — coming soon"
          data-testid="footer-app-store"
        >
          <AppleLogo size={28} weight="fill" />
          <span className={labelClass}>
            <span className={smallClass}>Download on the</span>
            <span className={mainClass}>App Store</span>
          </span>
        </button>
      </div>

      {iosModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-coming-soon-title"
          onClick={closeIosModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeIosModal}
              className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                <AppleLogo size={28} weight="fill" className="text-stone-800" />
              </div>
              <div>
                <h2 id="ios-coming-soon-title" className="font-heading text-xl font-bold text-stone-900">
                  iOS app coming soon
                </h2>
                <p className="text-sm text-stone-500">We&apos;re building the App Store release</p>
              </div>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed mb-5">
              TrimiT for iPhone isn&apos;t on the App Store yet. In the meantime, you can book salon
              services on our website — same account, same salons.
            </p>
            <a
              href={PUBLIC_SITE_URL}
              className="block w-full text-center py-3 rounded-xl bg-orange-800 text-white font-semibold hover:bg-orange-900 transition-colors"
            >
              Book on trimit.online
            </a>
            <button
              type="button"
              onClick={closeIosModal}
              className="mt-3 w-full py-2.5 text-sm text-stone-500 hover:text-stone-800"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default StoreDownloadLinks;
