/**
 * Live Attack Feed & Historical Table (Phase 5)
 * Combines real-time streaming SSE events with cursor-paginated attack records.
 * Supports pause/resume, deduplication, row selection for detail modal,
 * and clear loading/empty/error states.
 */

import React, { useState } from 'react';
import {
  Radio,
  History,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { AttackListItem } from '../../types/attacks';
import type { LiveAttackEvent } from '../../types/stream';

interface LiveAttackFeedProps {
  liveAttacks: LiveAttackEvent[];
  historicalAttacks: AttackListItem[];
  loading: boolean;
  error: string | null;
  isStreamPaused: boolean;
  hasMore: boolean;
  canPrev: boolean;
  pageNumber: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSelectAttack: (attack: AttackListItem) => void;
}

export const LiveAttackFeed: React.FC<LiveAttackFeedProps> = ({
  liveAttacks,
  historicalAttacks,
  loading,
  error,
  isStreamPaused,
  hasMore,
  canPrev,
  pageNumber,
  onNextPage,
  onPrevPage,
  onSelectAttack,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  const displayedAttacks = activeTab === 'live' ? liveAttacks : historicalAttacks;

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="soc-panel" style={{ marginBottom: '24px' }}>
      {/* Feed Mode Tabs & Counters */}
      <div className="soc-panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Tab 1: Live Feed */}
          <button
            onClick={() => setActiveTab('live')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              color: activeTab === 'live' ? '#38bdf8' : 'var(--text-muted)',
              backgroundColor: activeTab === 'live' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            <Radio size={14} color={activeTab === 'live' ? '#38bdf8' : 'currentColor'} />
            <span>Live Stream</span>
            <span
              className="mono"
              style={{
                fontSize: '0.6875rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {liveAttacks.length}
            </span>
          </button>

          {/* Tab 2: Historical Archive */}
          <button
            onClick={() => setActiveTab('history')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              color: activeTab === 'history' ? '#38bdf8' : 'var(--text-muted)',
              backgroundColor: activeTab === 'history' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            <History size={14} color={activeTab === 'history' ? '#38bdf8' : 'currentColor'} />
            <span>Historical Query</span>
            <span
              className="mono"
              style={{
                fontSize: '0.6875rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {historicalAttacks.length}
            </span>
          </button>
        </div>

        {/* Live Feed Status Message */}
        {activeTab === 'live' && isStreamPaused && (
          <span
            className="mono"
            style={{
              fontSize: '0.75rem',
              color: 'var(--status-warning)',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            Live feed display paused (events buffering in background)
          </span>
        )}

        {/* History Pagination Controls */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Page {pageNumber}
            </span>
            <button
              onClick={onPrevPage}
              disabled={!canPrev || loading}
              className="soc-btn"
              style={{ padding: '4px 8px' }}
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={onNextPage}
              disabled={!hasMore || loading}
              className="soc-btn"
              style={{ padding: '4px 8px' }}
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '14px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--severity-critical)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8125rem',
          }}
        >
          <AlertCircle size={18} />
          <span>Error retrieving attack records: {error}</span>
        </div>
      )}

      {/* Attack Table */}
      <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(0, 0, 0, 0.3)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <th style={{ padding: '10px 16px' }}>Time</th>
              <th style={{ padding: '10px 16px' }}>Severity</th>
              <th style={{ padding: '10px 16px' }}>Source IP</th>
              <th style={{ padding: '10px 16px' }}>Geo Location</th>
              <th style={{ padding: '10px 16px' }}>Target Request</th>
              <th style={{ padding: '10px 16px' }}>Attack Vector</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && displayedAttacks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading attack telemetry...
                </td>
              </tr>
            ) : displayedAttacks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={32} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      No attacks logged in this view
                    </span>
                    <span style={{ fontSize: '0.75rem' }}>
                      {activeTab === 'live'
                        ? 'Listening for incoming live attacks on /api/v1/attacks/stream...'
                        : 'Try adjusting your filters or search criteria.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              displayedAttacks.map((attack) => {
                const isLive = 'is_live' in attack && Boolean((attack as LiveAttackEvent).is_live);
                return (
                  <tr
                    key={attack.id}
                    onClick={() => onSelectAttack(attack)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: isLive ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isLive
                        ? 'rgba(56, 189, 248, 0.04)'
                        : 'transparent';
                    }}
                  >
                    {/* Timestamp */}
                    <td className="mono" style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isLive && (
                          <span title="Live Event" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <Sparkles size={13} color="#38bdf8" />
                          </span>
                        )}
                        <span>{formatTimestamp(attack.timestamp)}</span>
                      </div>
                    </td>

                    {/* Severity Level & Score */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <span className={`badge-severity ${attack.severity_level}`}>
                        {attack.severity_level} ({attack.severity_score})
                      </span>
                    </td>

                    {/* Source IP & Port */}
                    <td className="mono" style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{attack.source_ip}</span>
                        {attack.is_private_ip ? (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              padding: '1px 4px',
                              borderRadius: '2px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            RFC1918
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Geo Location */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {attack.is_private_ip ? (
                        <span style={{ color: 'var(--text-muted)' }}>Internal Network</span>
                      ) : attack.geoip_status === 'UNAVAILABLE' ? (
                        <span style={{ color: 'var(--text-muted)' }}>GeoIP Unavailable</span>
                      ) : (
                        <span>
                          {attack.geo_country_code && attack.geo_country_code !== 'XX'
                            ? `${attack.geo_city}, ${attack.geo_country_code}`
                            : 'Unknown'}
                        </span>
                      )}
                    </td>

                    {/* Target HTTP Request */}
                    <td className="mono" style={{ padding: '10px 16px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600, marginRight: '6px' }}>
                        {attack.http_method}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{attack.request_path}</span>
                    </td>

                    {/* Primary Attack Vector */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {attack.primary_category}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAttack(attack);
                        }}
                        className="soc-btn"
                        style={{ padding: '3px 8px', fontSize: '0.6875rem' }}
                      >
                        <span>Details</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
