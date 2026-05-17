import React from 'react';
import { Link } from 'react-router-dom';

const ICON_SRC = `${process.env.PUBLIC_URL || ''}/branding/logo.png`;
const HORIZONTAL_SRC = `${process.env.PUBLIC_URL || ''}/branding/logo-horizontal.png`;

/**
 * TrimiT brand mark (transparent PNG from mobile assets).
 * @param {'icon' | 'horizontal' | 'icon-text'} variant
 * @param {'light' | 'dark'} tone — light = dark text beside icon; dark = on hero/footer
 *
 * Prefer `icon-text` on dark backgrounds. `logo-horizontal.png` has an opaque black
 * canvas — do not use CSS invert on it (creates a white rectangle).
 */
export function TrimitLogo({
  variant = 'icon-text',
  tone = 'light',
  className = '',
  iconClassName = 'h-10 w-10',
  horizontalClassName = 'h-9 w-auto max-w-[140px] sm:max-w-[180px]',
  showWordmark = true,
  to = '/',
  asLink = true,
}) {
  const wordmarkClass =
    tone === 'dark'
      ? 'font-heading text-xl font-bold text-white tracking-tight'
      : 'font-heading text-xl font-bold text-stone-900 tracking-tight';

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {variant === 'horizontal' ? (
        <img
          src={HORIZONTAL_SRC}
          alt="TrimiT"
          className={`object-contain object-left ${horizontalClassName}${
            tone === 'dark' ? ' mix-blend-screen' : ''
          }`}
          width={180}
          height={36}
          decoding="async"
        />
      ) : (
        <>
          <img
            src={ICON_SRC}
            alt=""
            aria-hidden
            className={`object-contain shrink-0 ${iconClassName}`}
            width={40}
            height={40}
            decoding="async"
          />
          {(variant === 'icon-text' && showWordmark) ? (
            <span className={wordmarkClass}>TrimiT</span>
          ) : null}
        </>
      )}
    </span>
  );

  if (!asLink) return content;

  return (
    <Link to={to} className="group inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-800/40 rounded-lg">
      {content}
    </Link>
  );
}

export default TrimitLogo;
