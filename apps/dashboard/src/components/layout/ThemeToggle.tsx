
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
        width: '88px',
        height: '36px',
        boxSizing: 'border-box',
        borderRadius: '9999px',
        border: isLight
          ? '1px solid rgba(255, 255, 255, 0.45)'
          : '1px solid rgba(255, 255, 255, 0.18)',
        borderTop: isLight
          ? '1px solid rgba(255, 255, 255, 0.75)'
          : '1px solid rgba(255, 255, 255, 0.35)',
        background: isLight
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.3) 100%)'
          : 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%)',
        backdropFilter: 'blur(20px) saturate(200%)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        boxShadow: isLight
          ? '0 0 20px rgba(245, 158, 11, 0.45), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
          : '0 0 18px rgba(56, 189, 248, 0.25), 0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0',
        userSelect: 'none',
        outline: 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Label Text inside Track */}
      <span
        style={{
          position: 'absolute',
          right: isLight ? '12px' : 'auto',
          left: isLight ? 'auto' : '12px',
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: isLight ? '#ffffff' : '#94a3b8',
          textShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.6)',
          textTransform: 'lowercase',
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.25s ease',
          pointerEvents: 'none',
        }}
      >
        {isLight ? 'light' : 'dark'}
      </span>

      {/* 3D Glass Lens Sliding Thumb */}
      <div
        style={{
          position: 'absolute',
          top: '3px',
          left: isLight ? '4px' : '54px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: isLight
            ? 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.35) 65%, rgba(255, 255, 255, 0.15) 100%)'
            : 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.65) 0%, rgba(56, 189, 248, 0.3) 65%, rgba(15, 23, 42, 0.5) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.75)',
          borderTop: '2px solid #ffffff',
          boxShadow: isLight
            ? '0 3px 10px rgba(180, 83, 9, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.15)'
            : '0 3px 10px rgba(0, 0, 0, 0.5), inset 0 2px 2px rgba(255, 255, 255, 0.6), inset 0 -1px 2px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Curved Specular Glare Arc */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '4px',
            right: '4px',
            height: '8px',
            borderRadius: '50% 50% 0 0',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {isLight ? (
          <Sun size={15} color="#ffffff" strokeWidth={2.4} style={{ filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))' }} />
        ) : (
          <Moon size={14} color="#38bdf8" strokeWidth={2.4} style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.8))' }} />
        )}
      </div>
    </button>
  );
};

