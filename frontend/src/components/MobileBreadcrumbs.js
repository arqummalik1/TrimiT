import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { getBreadcrumbsForPath } from '../lib/breadcrumbs';

/**
 * Visible below the header on small screens (lg:hidden).
 */
export default function MobileBreadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = getBreadcrumbsForPath(pathname);

  if (!crumbs?.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="lg:hidden border-b border-stone-200/80 bg-white/90 backdrop-blur-sm"
    >
      <ol className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-1 text-xs sm:text-sm text-stone-500">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1 min-w-0">
              {index > 0 ? (
                <CaretRight size={12} className="shrink-0 text-stone-400" aria-hidden />
              ) : null}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="truncate max-w-[9rem] sm:max-w-[12rem] hover:text-orange-800 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[10rem] sm:max-w-[14rem] ${
                    isLast ? 'text-stone-800 font-medium' : ''
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
