/**
 * SOC Dashboard Header (Phase 5)
 * Displays VIGILANCE branding, backend health, real-time SSE stream status,
 * last refresh timestamp, and global manual refresh / stream pause controls.
 */

import React from 'react';
import {
  ShieldAlert,
  Activity,
  Radio,
  RefreshCw,
  Pause,
  Play,
  Server,
} from 'lucide-react';
import type { SSEConnectionStatus } from '../../types/stream';

interface HeaderProps {
  backendReachable: boolean;
  streamStatus: SSEConnectionStatus;
  lastUpdated: Date | null;
  isStreamPaused: boolean;
  onTogglePause: () => void;
  onRefreshAll: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  backendReachable,
  streamStatus,
  lastUpdated,
  isStreamPaused,
  onTogglePause,
  onRefreshAll,
  isRefreshing = false,
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
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(37, 99, 235, 0.4))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <ShieldAlert size={24} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                VIGILANCE
              </h1>
              <span
                className="mono"
                style={{
                  fontSize: '0.6875rem',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                SOC DASHBOARD v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Decoy Intranet Telemetry & Real-Time Threat Intelligence
            </p>
          </div>
        </div>

        {/* Center: System Connection Monitors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Backend Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Server size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>REST API:</span>
            <span className={`pulse-dot ${backendReachable ? 'CONNECTED' : 'DISCONNECTED'}`} />
            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {backendReachable ? 'CONNECTED' : 'UNREACHABLE'}
            </span>
          </div>

          {/* SSE Stream Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Radio size={15} color={streamStatus === 'CONNECTED' ? '#10b981' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kafka → SSE:</span>
            <span className={`pulse-dot ${streamStatus}`} />
            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {streamStatus}
            </span>
          </div>

          {/* Last Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated:</span>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {formatTime(lastUpdated)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Stream Pause/Resume Toggle */}
          <button
            onClick={onTogglePause}
            className={`soc-btn ${isStreamPaused ? 'soc-btn-primary' : ''}`}
            title={isStreamPaused ? 'Resume live visual updates' : 'Pause visual updates'}
          >
            {isStreamPaused ? (
              <>
                <Play size={14} />
                <span>Resume Feed</span>
              </>
            ) : (
              <>
                <Pause size={14} />
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
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
