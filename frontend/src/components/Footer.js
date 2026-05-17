import React from 'react';
import { Link } from 'react-router-dom';
import StoreDownloadLinks from './StoreDownloadLinks';
import TrimitLogo from './brand/TrimitLogo';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-stone-100 border-t border-stone-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <TrimitLogo variant="icon-text" iconClassName="h-9 w-9" />

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-600">
            <Link to="/privacy" className="hover:text-orange-800 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-orange-800 transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-orange-800 transition-colors">
              Contact
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-stone-200">
          <p className="text-sm font-medium text-stone-700 mb-4 text-center md:text-left">
            Get the app
          </p>
          <div className="flex justify-center md:justify-start">
            <StoreDownloadLinks variant="light" />
          </div>
        </div>

        <div className="mt-8 text-sm text-stone-500 text-center md:text-left">
          © {year} TrimiT. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
