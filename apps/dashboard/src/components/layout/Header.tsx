

import React from 'react';
import {
  Activity,
  Radio,
  RefreshCw,
  Pause,
  Play,
  Server,
} from 'lucide-react';
import type { SSEConnectionStatus } from '../../types/stream';
import { ThemeToggle } from './ThemeToggle';
import { VigilanceLogo } from './VigilanceLogo';

interface HeaderProps {
  backendReachable: boolean;
  streamStatus: SSEConnectionStatus;
  lastUpdated: Date | null;
  isStreamPaused: boolean;
  onTogglePause: () => void;
  onRefreshAll: () => void;
  isRefreshing?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendReachable,
  streamStatus,
  lastUpdated,
  isStreamPaused,
  onTogglePause,
  onRefreshAll,
  isRefreshing = false,
  theme = 'dark',
  onToggleTheme,
}) => {
  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="soc-panel" style={{ marginBottom: '20px', borderRadius: 'var(--radius-lg)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left: Branding & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.35))',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderTop: '1px solid rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
              flexShrink: 0,
            }}
          >
            <VigilanceLogo size={28} theme={theme} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'var(--brand-title-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                VIGILANCE
              </h1>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Nowhere Esports Network Telemetry & Real-Time Threat Intelligence
            </p>
          </div>
        </div>

        {/* Center: Unified Real-Time Telemetry Bar */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '36px',
            padding: '0 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--pill-bg)',
            border: '1px solid var(--border-subtle)',
            borderTop: '1px solid var(--border-strong)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.25)',
            gap: '12px',
          }}
        >
          {/* Backend Status */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>REST API:</span>
            <span className={`pulse-dot ${backendReachable ? 'CONNECTED' : 'DISCONNECTED'}`} />
            <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              {backendReachable ? 'CONNECTED' : 'UNREACHABLE'}
            </span>
          </div>

          <span style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

          {/* SSE Stream Status */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color={streamStatus === 'CONNECTED' ? '#30d158' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Kafka → SSE:</span>
            <span className={`pulse-dot ${streamStatus}`} />
            <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              {streamStatus}
            </span>
          </div>

          <span style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

          {/* Last Refresh */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Updated:</span>
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {formatTime(lastUpdated)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Nowhere Esports Intranet & Control Center Shortcut */}
          <a
            href="https://owhere-esports-portal.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="soc-btn"
            style={{
              height: '36px',
              textDecoration: 'none',
              background: 'linear-gradient(135deg, rgba(255, 42, 75, 0.12), rgba(200, 16, 46, 0.18))',
              border: '1px solid rgba(255, 42, 75, 0.35)',
              color: '#ff4767',
              fontWeight: 700,
              gap: '6px',
            }}
            title="Open NC Intranet & Decoy Match Operations"
          >
            <img
              src="/images/nowhere-logo.png"
              alt="Nowhere"
              style={{ width: '15px', height: '15px', objectFit: 'contain' }}
            />
            <span>NC Intranet</span>
          </a>

          {/* Apple Liquid Glass Theme Toggle */}
          {onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          {/* Stream Pause/Resume Toggle */}
          <button
            onClick={onTogglePause}
            className={`soc-btn ${isStreamPaused ? 'soc-btn-primary' : ''}`}
            title={isStreamPaused ? 'Resume live visual updates' : 'Pause visual updates'}
          >
            {isStreamPaused ? (
              <>
                <Play size={13} />
                <span>Resume Feed</span>
              </>
            ) : (
              <>
                <Pause size={13} />
                <span>Pause Feed</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="soc-btn"
            title="Refresh analytics and attack history"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
