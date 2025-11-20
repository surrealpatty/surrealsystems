'use client';

import React from 'react';

/**
 * SiteLogoInline
 * - size: pixel width of the logo (height scales by SVG aspect ratio)
 * - color: brand color used for the C stroke and "Code" text (default is #062e7f)
 * - idSuffix: optional string to guarantee unique gradient/title ids (useful in SSR without React.useId)
 *
 * Note: This is a client component (use 'use client') because it uses React.useId when available.
 */
export default function SiteLogoInline({ size = 160, color = '#062e7f', idSuffix = '' }) {
  // generate unique id for gradient / title / desc:
  const hookId = (typeof React.useId === 'function') ? React.useId() : null;
  const uid = hookId || idSuffix || 'logo';
  const gradId = `gradL-${uid}`;
  const titleId = `logoTitle-${uid}`;
  const descId = `logoDesc-${uid}`;

  const height = Math.round((160 / 420) * size);

  return (
    <a href="/" aria-label="Code Crowds" style={{ color, display: 'inline-block' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 420 160"
        width={size}
        height={height}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        preserveAspectRatio="xMinYMin meet"
      >
        <title id={titleId}>Code Crowds — Monogram (open right, no tail)</title>
        <desc id={descId}>Rounded-square badge with centered C opening to the right (no terminal tail)</desc>

        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#4e54c8" />
            <stop offset="1" stopColor="#00aaff" />
          </linearGradient>
        </defs>

        <rect x="6" y="6" width="148" height="148" rx="18" fill={`url(#${gradId})`} />

        <g>
          <path
            d="M113.829 92.313 A36 36 0 1 1 113.829 67.687"
            fill="none"
            stroke="#ffffff"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.98"
          />
          <path
            d="M113.829 92.313 A36 36 0 1 1 113.829 67.687"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
          />
        </g>

        <g transform="translate(170,98)" fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial">
          <text x="0" y="0" fontWeight="800" fontSize="36" fill={color}>
            Code
          </text>
          <text x="110" y="0" fontWeight="700" fontSize="36" fill="#ffffff" opacity="0.95">
            Crowds
          </text>
        </g>
      </svg>
    </a>
  );
}
