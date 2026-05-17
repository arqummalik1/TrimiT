import React from 'react';

const ILLUSTRATIONS = {
  haircut: (
    <>
      <circle cx="120" cy="108" r="72" fill="#fed7aa" opacity="0.35" />
      <ellipse cx="118" cy="92" rx="44" ry="50" fill="#451a03" />
      <path
        d="M88 78c6-18 22-28 30-28s24 10 30 28c-4 6-12 10-30 10s-26-4-30-10z"
        fill="#292524"
      />
      <path
        d="M78 95c4 38 18 58 40 58s36-20 40-58c-8 12-22 18-40 18s-32-6-40-18z"
        fill="#57534e"
      />
      <path d="M98 88c8 6 16 8 24 8s16-2 24-8" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" fill="none" />
      <g transform="translate(158 48) rotate(28)">
        <path d="M4 4 L52 52" stroke="#9a3412" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 0 L56 44" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="56" cy="48" r="12" fill="#ea580c" />
        <circle cx="56" cy="48" r="5" fill="#ffedd5" />
      </g>
      <rect x="42" y="158" width="56" height="36" rx="10" fill="#fff7ed" opacity="0.9" />
      <path d="M52 172h36M48 182h44" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  spa: (
    <>
      <circle cx="120" cy="110" r="70" fill="#fecdd3" opacity="0.35" />
      <ellipse cx="120" cy="175" rx="75" ry="20" fill="#fda4af" opacity="0.25" />
      <ellipse cx="88" cy="158" rx="26" ry="16" fill="#a8a29e" />
      <ellipse cx="152" cy="158" rx="26" ry="16" fill="#78716c" />
      <ellipse cx="120" cy="142" rx="34" ry="20" fill="#d6d3d1" />
      <path d="M62 125 Q120 98 178 125" stroke="#059669" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="78" cy="118" r="14" fill="#86efac" />
      <circle cx="120" cy="108" r="16" fill="#4ade80" />
      <circle cx="162" cy="118" r="13" fill="#bbf7d0" />
      <path
        d="M108 72c0-14 24-14 24 0v8c0 8-6 14-12 14s-12-6-12-14v-8z"
        fill="#15803d"
        opacity="0.85"
      />
      <path d="M100 58 Q120 42 140 58" stroke="#166534" strokeWidth="2" fill="none" />
    </>
  ),
  beard: (
    <>
      <circle cx="120" cy="108" r="68" fill="#fde68a" opacity="0.4" />
      <ellipse cx="120" cy="88" rx="40" ry="44" fill="#fde68a" />
      <path
        d="M92 92c0-20 16-32 28-32s28 12 28 32v6c0 30-16 44-28 44s-28-14-28-44v-6z"
        fill="#44403c"
        opacity="0.15"
      />
      <path
        d="M96 98c6 36 16 52 24 52s18-16 24-52c-6 6-14 10-24 10s-18-4-24-10z"
        fill="#57534e"
      />
      <path d="M104 90 Q120 98 136 90" stroke="#292524" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g transform="translate(162 128) rotate(-32)">
        <rect x="0" y="10" width="16" height="72" rx="5" fill="#ea580c" />
        <path d="M3 10h10M3 22h10M3 34h10M3 46h10M3 58h10" stroke="#9a3412" strokeWidth="1.2" />
        <rect x="-5" y="0" width="26" height="14" rx="4" fill="#c2410c" />
      </g>
      <circle cx="58" cy="150" r="8" fill="#fdba74" opacity="0.55" />
    </>
  ),
  facial: (
    <>
      <circle cx="120" cy="108" r="70" fill="#fce7f3" opacity="0.45" />
      <ellipse cx="120" cy="95" rx="42" ry="46" fill="#fecdd3" opacity="0.55" />
      <ellipse cx="108" cy="88" rx="7" ry="4" fill="#1c1917" opacity="0.12" />
      <ellipse cx="132" cy="88" rx="7" ry="4" fill="#1c1917" opacity="0.12" />
      <path d="M110 100 Q120 106 130 100" stroke="#be123c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="82" y="118" width="76" height="52" rx="16" fill="#fff7ed" />
      <path d="M94 132h52M90 144h60M96 156h48" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" />
      <circle cx="68" cy="148" r="10" fill="#38bdf8" opacity="0.45" />
      <circle cx="172" cy="132" r="12" fill="#7dd3fc" opacity="0.4" />
      <circle cx="120" cy="178" r="9" fill="#bae6fd" opacity="0.5" />
      <path d="M120 52v20M108 62h24" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
};

/**
 * Premium inline SVG illustrations for service cards (instant load, no external URLs).
 */
export function ServiceIllustration({ type, className = '' }) {
  const content = ILLUSTRATIONS[type];
  if (!content) return null;

  return (
    <svg
      className={className}
      viewBox="0 0 240 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      role="img"
    >
      <defs>
        <linearGradient id={`svc-shine-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="240" height="220" fill={`url(#svc-shine-${type})`} />
      {content}
    </svg>
  );
}

export default ServiceIllustration;
