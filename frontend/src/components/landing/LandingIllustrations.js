import React from 'react';

/** Salon booking confirmed — upbeat motif (no face-like shapes) */
export function HeroAccentIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="200" cy="200" r="160" stroke="rgba(251,146,60,0.35)" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="120" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Calendar — booking at a glance */}
      <rect x="118" y="118" width="164" height="148" rx="20" fill="rgba(255,247,237,0.95)" />
      <rect x="118" y="118" width="164" height="40" rx="20" fill="rgba(234,88,12,0.9)" />
      <circle cx="148" cy="138" r="6" fill="rgba(255,237,213,0.9)" />
      <circle cx="252" cy="138" r="6" fill="rgba(255,237,213,0.9)" />
      <path d="M148 178h32M148 206h48M148 234h40" stroke="rgba(120,53,15,0.35)" strokeWidth="3" strokeLinecap="round" />
      <path d="M212 178h48M212 206h32" stroke="rgba(120,53,15,0.25)" strokeWidth="3" strokeLinecap="round" />

      {/* Confirmed check — positive completion */}
      <circle cx="268" cy="248" r="36" fill="rgba(22,163,74,0.92)" />
      <path
        d="M252 248l12 12 24-28"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Scissors — salon cue */}
      <g transform="translate(88 92) rotate(-18)">
        <circle cx="18" cy="18" r="14" stroke="rgba(255,237,213,0.95)" strokeWidth="3" fill="none" />
        <circle cx="42" cy="42" r="14" stroke="rgba(255,237,213,0.95)" strokeWidth="3" fill="none" />
        <path d="M28 28 L52 52" stroke="rgba(251,146,60,0.95)" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Upward celebration arc */}
      <path
        d="M96 292 Q200 340 304 292"
        stroke="rgba(251,146,60,0.55)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      <circle cx="300" cy="118" r="9" fill="#fb923c" opacity="0.95" />
      <circle cx="92" cy="268" r="7" fill="#fdba74" opacity="0.85" />
      <path
        d="M318 168l6 12 14-18"
        stroke="#fde68a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StepIllustration({ step, className = '' }) {
  const icons = {
    1: (
      <path
        d="M32 48h64M48 32v32M80 32v32M32 80h64"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    ),
    2: (
      <>
        <rect x="28" y="36" width="72" height="48" rx="8" stroke="currentColor" strokeWidth="3" />
        <path d="M40 52h48M40 64h32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    3: (
      <path
        d="M44 72l16 16 32-40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  };

  return (
    <svg className={className} viewBox="0 0 128 128" fill="none" aria-hidden>
      <rect width="128" height="128" rx="28" fill="currentColor" fillOpacity="0.08" />
      <g className="text-orange-800" transform="translate(32 32)">
        {icons[step]}
      </g>
    </svg>
  );
}
