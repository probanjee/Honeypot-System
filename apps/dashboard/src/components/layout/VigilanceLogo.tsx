import React from 'react';

interface VigilanceLogoProps {
  size?: number;
  className?: string;
  theme?: 'light' | 'dark';
}


export const VigilanceLogo: React.FC<VigilanceLogoProps> = ({
  size = 28,
  className = '',
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Gradient stops adapted for theme
  const shieldGradStart = isLight ? '#0284c7' : '#38bdf8';
  const shieldGradMid = isLight ? '#2563eb' : '#3b82f6';
  const shieldGradEnd = isLight ? '#4f46e5' : '#6366f1';

  const vGradStart = isLight ? '#0ea5e9' : '#67e8f9';
  const vGradMid = isLight ? '#0284c7' : '#38bdf8';
  const vGradEnd = isLight ? '#1d4ed8' : '#2563eb';

  const coreFill = isLight ? 'rgba(2, 132, 199, 0.16)' : 'rgba(56, 189, 248, 0.22)';
  const pulseColor = isLight ? '#0284c7' : '#00f0ff';
  const shieldFill = isLight ? 'rgba(2, 132, 199, 0.05)' : 'rgba(56, 189, 248, 0.08)';
  const vStroke = isLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.35)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Dynamic Dual-Tone Shield Gradient */}
        <linearGradient id="vigilanceShieldGrad" x1="9" y1="4" x2="39" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={shieldGradStart} />
          <stop offset="50%" stopColor={shieldGradMid} />
          <stop offset="100%" stopColor={shieldGradEnd} />
        </linearGradient>

        {/* Dynamic Bold 'V' Gradient */}
        <linearGradient id="vigilanceVGrad" x1="14" y1="13" x2="34" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={vGradStart} />
          <stop offset="50%" stopColor={vGradMid} />
          <stop offset="100%" stopColor={vGradEnd} />
        </linearGradient>

        {/* Honeycomb Core Gradient */}
        <linearGradient id="vigilanceCoreGrad" x1="19.7" y1="11" x2="28.3" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={shieldGradStart} />
          <stop offset="100%" stopColor={shieldGradEnd} />
        </linearGradient>

        {/* Neon Specular Glow Filter */}
        <filter id="vigilanceGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={isLight ? '0.6' : '1.2'} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Outer Chiseled Cyber Shield Silhouette */}
      <path
        d="M24 4 L39 9.5 L35 24 L24 42 L13 24 L9 9.5 Z"
        stroke="url(#vigilanceShieldGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={shieldFill}
      />

      {/* 2. Bold Vigilance 'V' Vector Chevron Wings */}
      <path
        d="M14 13 L24 33 L34 13 L29 13 L24 23 L19 13 Z"
        fill="url(#vigilanceVGrad)"
        stroke={vStroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* 3. Nested Central Honeypot Hexagonal Cell */}
      <polygon
        points="24,11 28.3,13.5 28.3,18.5 24,21 19.7,18.5 19.7,13.5"
        stroke="url(#vigilanceCoreGrad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={coreFill}
      />

      {/* 4. Glowing Sentinel Radar Core */}
      <circle cx="24" cy="16" r="2.2" fill={pulseColor} filter="url(#vigilanceGlow)" />

      {/* 5. Lower Sentinel Apex Flare */}
      <polygon
        points="24,35.5 26.2,37.7 24,39.9 21.8,37.7"
        fill={pulseColor}
        filter="url(#vigilanceGlow)"
      />
    </svg>
  );
};
