import React from 'react';

/** Premium salon booking visual — phone + calendar (no face-like shapes) */
export function HeroAccentIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="200" cy="200" r="168" stroke="rgba(251,146,60,0.28)" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="128" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* Phone frame */}
      <rect x="128" y="72" width="144" height="256" rx="28" fill="rgba(28,25,23,0.55)" stroke="rgba(255,237,213,0.5)" strokeWidth="2" />
      <rect x="168" y="88" width="64" height="8" rx="4" fill="rgba(255,255,255,0.25)" />

      {/* App screen */}
      <rect x="140" y="108" width="120" height="196" rx="16" fill="rgba(255,247,237,0.96)" />
      <rect x="140" y="108" width="120" height="36" rx="16" fill="rgba(234,88,12,0.92)" />
      <path d="M156 128h88M156 160h56M156 184h72" stroke="rgba(120,53,15,0.3)" strokeWidth="3" strokeLinecap="round" />
      <rect x="156" y="200" width="88" height="28" rx="8" fill="rgba(251,146,60,0.25)" />
      <rect x="156" y="236" width="88" height="28" rx="8" fill="rgba(251,146,60,0.15)" />

      {/* Scissors accent */}
      <g transform="translate(72 108) rotate(-22)">
        <circle cx="16" cy="16" r="12" stroke="rgba(255,237,213,0.9)" strokeWidth="2.5" fill="none" />
        <circle cx="38" cy="38" r="12" stroke="rgba(255,237,213,0.9)" strokeWidth="2.5" fill="none" />
        <path d="M24 24 L44 44" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Success badge */}
      <circle cx="288" cy="268" r="34" fill="rgba(22,163,74,0.95)" />
      <path
        d="M272 268l10 10 22-26"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="312" cy="108" r="7" fill="#fb923c" opacity="0.9" />
      <circle cx="88" cy="288" r="5" fill="#fdba74" opacity="0.85" />
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
