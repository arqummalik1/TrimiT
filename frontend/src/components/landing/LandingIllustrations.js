import React from 'react';

/** Abstract salon / booking motif for hero panel */
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
      <path
        d="M120 240c40-60 120-60 160 0M140 160h120M160 140v40M240 140v40"
        stroke="rgba(255,237,213,0.9)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="155" y="250" width="90" height="56" rx="12" fill="rgba(154,52,18,0.85)" />
      <path d="M175 278h50M175 292h35" stroke="rgba(255,237,213,0.7)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="290" cy="130" r="8" fill="#fb923c" opacity="0.9" />
      <circle cx="110" cy="280" r="6" fill="#fdba74" opacity="0.8" />
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
