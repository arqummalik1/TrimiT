import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors } from '@phosphor-icons/react';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-stone-100 border-t border-stone-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-orange-800 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
              <Scissors size={20} weight="bold" className="text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-stone-900 tracking-tight">
              TrimiT
            </span>
          </Link>

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

        <div className="mt-8 pt-6 border-t border-stone-200 text-sm text-stone-500">
          © {year} TrimiT. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
