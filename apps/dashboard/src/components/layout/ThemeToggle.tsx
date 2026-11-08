/**
 * Apple Liquid Glass Theme Toggle Switch
 * High-fidelity pill capsule with frosted glass thumb, specular highlights,
 * warm amber sunlight glow in light mode, and cool cyber-indigo glow in dark mode.
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isLight = theme === 'light';

  return (
    <button
      onClick={onToggle}
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Toggle light and dark theme"
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      style={{
        position: 'relative',
        width: '94px',
        height: '38px',
        borderRadius: '9999px',
        border: isLight
          ? '1px solid rgba(255, 255, 255, 0.45)'
          : '1px solid rgba(255, 255, 255, 0.2)',
        borderTop: isLight
          ? '1px solid rgba(255, 255, 255, 0.75)'
          : '1px solid rgba(255, 255, 255, 0.35)',
        background: isLight
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.3) 100%)'
          : 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%)',
        backdropFilter: 'blur(20px) saturate(200%)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        boxShadow: isLight
          ? '0 0 28px rgba(245, 158, 11, 0.55), 0 4px 14px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
          : '0 0 24px rgba(56, 189, 248, 0.35), 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
        userSelect: 'none',
        outline: 'none',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Label Text inside Track */}
      <span
        style={{
          position: 'absolute',
          right: isLight ? '14px' : 'auto',
          left: isLight ? 'auto' : '14px',
          fontSize: '0.8125rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: isLight ? '#ffffff' : '#94a3b8',
          textShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.5)',
          textTransform: 'lowercase',
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
        }}
      >
        {isLight ? 'light' : 'dark'}
      </span>

      {/* 3D Glass Lens Sliding Thumb */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: isLight ? '3px' : '55px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isLight
            ? 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.35) 65%, rgba(255, 255, 255, 0.15) 100%)'
            : 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.65) 0%, rgba(56, 189, 248, 0.3) 65%, rgba(15, 23, 42, 0.5) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.75)',
          borderTop: '2px solid #ffffff',
          boxShadow: isLight
            ? '0 4px 12px rgba(180, 83, 9, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.15)'
            : '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 2px 2px rgba(255, 255, 255, 0.6), inset 0 -1px 2px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Curved Specular Glare Arc */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '5px',
            right: '5px',
            height: '10px',
            borderRadius: '50% 50% 0 0',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {isLight ? (
          <Sun size={17} color="#ffffff" strokeWidth={2.4} style={{ filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))' }} />
        ) : (
          <Moon size={16} color="#38bdf8" strokeWidth={2.4} style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.8))' }} />
        )}
      </div>
    </button>
  );
};

