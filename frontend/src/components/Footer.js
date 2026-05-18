import React from 'react';
import { Link } from 'react-router-dom';
import StoreDownloadLinks from './StoreDownloadLinks';
import TrimitLogo from './brand/TrimitLogo';
import { LOCAL_SEO_SECTIONS } from '../config/localSeoSections';

const MARKETING_ROUTES = [
  { to: '/explore', label: 'Explore salons' },
  { to: '/for-salons', label: 'For salon owners' },
  { to: '/blog', label: 'Blog' },
  { to: '/salons-in-jammu', label: 'Salons in Jammu' },
];

const Footer = () => {
  const year = new Date().getFullYear();

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
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-200 mb-4">Discover</p>
            <nav className="flex flex-col gap-2 text-sm">
              {MARKETING_ROUTES.map(({ to, label }) => (
                <Link key={to} to={to} className="hover:text-orange-300 transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-200 mb-4">Services in Jammu</p>
            <nav className="flex flex-col gap-2 text-sm">
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
            <nav className="flex flex-col gap-2 text-sm mb-6">
              <Link to="/privacy" className="hover:text-orange-300 transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-orange-300 transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="hover:text-orange-300 transition-colors">
                Contact
              </Link>
            </nav>
            <StoreDownloadLinks variant="dark" />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
          <p>&copy; {year} TrimiT. All rights reserved.</p>
          <p className="text-stone-500">Salon booking Jammu · trimit.online</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
