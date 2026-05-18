import React from 'react';
import { Link } from 'react-router-dom';
import StoreDownloadLinks from './StoreDownloadLinks';
import TrimitLogo from './brand/TrimitLogo';
import { LOCAL_SEO_SECTIONS } from '../config/localSeoSections';
import {
  APP_VERSION,
  APP_RELEASE_CHANNEL,
  COPYRIGHT_YEAR,
  PRODUCT_NAME,
  formatCopyright,
  formatVersionLine,
} from '../config/appVersion';

const MARKETING_ROUTES = [
  { to: '/explore', label: 'Explore salons' },
  { to: '/for-salons', label: 'For salon owners' },
  { to: '/blog', label: 'Blog' },
  { to: '/salons-in-jammu', label: 'Salons in Jammu' },
];

const LEGAL_LINKS = [
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/contact', label: 'Contact' },
];

const Footer = () => {
  return (
    <footer className="bg-stone-900 text-stone-400 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <TrimitLogo
              variant="icon-text"
              tone="dark"
              iconClassName="h-9 w-9"
              className="mb-4"
            />
            <p className="text-sm text-stone-400 leading-relaxed">
              Premium salon booking in Jammu & Kashmir. Discover, book, and manage appointments
              online.
            </p>
            <p className="mt-4 text-xs text-stone-500">{formatVersionLine()}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-200 mb-4">Discover</p>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Discover">
              {MARKETING_ROUTES.map(({ to, label }) => (
                <Link key={to} to={to} className="hover:text-orange-300 transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-200 mb-4">Services in Jammu</p>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Services">
              {LOCAL_SEO_SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  to={s.seoPath}
                  className="hover:text-orange-300 transition-colors"
                >
                  {s.heading.replace(' in Jammu', '')}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-200 mb-4">Legal & app</p>
            <nav className="flex flex-col gap-2 text-sm mb-6" aria-label="Legal">
              {LEGAL_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} className="hover:text-orange-300 transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
            <StoreDownloadLinks variant="dark" />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-stone-800 space-y-4">
          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-stone-400"
            aria-label="Legal footer"
          >
            {LEGAL_LINKS.map(({ to, label }, i) => (
              <React.Fragment key={to}>
                {i > 0 && <span className="text-stone-600 hidden sm:inline" aria-hidden>|</span>}
                <Link to={to} className="hover:text-orange-300 transition-colors">
                  {label}
                </Link>
              </React.Fragment>
            ))}
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-center sm:text-left">
            <p>{formatCopyright()}</p>
            <p className="text-stone-500">
              {PRODUCT_NAME} v{APP_VERSION} · {APP_RELEASE_CHANNEL} · {COPYRIGHT_YEAR} ·{' '}
              <a
                href="https://trimit.online"
                className="hover:text-orange-300 transition-colors"
                rel="noopener noreferrer"
              >
                trimit.online
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
