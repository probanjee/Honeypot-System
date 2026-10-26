/**
 * Summary Analytics Cards (Phase 5)
 * Displays total attacks, critical incidents, distinct threat actors,
 * and top attack vector from GET /api/v1/analytics/summary.
 */

import React from 'react';
import {
  AlertTriangle,
  Flame,
  Users,
  Crosshair,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { SummaryAnalytics, TimeWindowOption } from '../../types/analytics';

interface SummaryCardsProps {
  summary: SummaryAnalytics | null;
  loading: boolean;
  error: string | null;
  windowOption: TimeWindowOption;
  onChangeWindow: (w: TimeWindowOption) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  loading,
  error,
  windowOption,
  onChangeWindow,
}) => {
  const criticalCount = summary?.severity_breakdown?.['CRITICAL'] || 0;
  const highCount = summary?.severity_breakdown?.['HIGH'] || 0;
  const topCategory = summary?.top_categories?.[0]?.category || 'None';
  const topCategoryCount = summary?.top_categories?.[0]?.count || 0;

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Time Window Tabs Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Analytical Aggregation Window:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['1h', '24h', '7d'] as TimeWindowOption[]).map((w) => (
            <button
              key={w}
              onClick={() => onChangeWindow(w)}
              className="soc-btn"
              style={{
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: windowOption === w ? 'var(--severity-info-bg)' : 'var(--bg-surface-elevated)',
                borderColor: windowOption === w ? '#38bdf8' : 'var(--border-subtle)',
                color: windowOption === w ? '#38bdf8' : 'var(--text-secondary)',
              }}
            >
              {w === '1h' ? 'Last 1 Hour' : w === '24h' ? 'Last 24 Hours' : 'Last 7 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--severity-critical)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8125rem',
          }}
        >
          <AlertCircle size={18} />
          <span>Error loading analytical metrics: {error}</span>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Attack Volume */}
        <div className="soc-panel soc-panel-body" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Total Attacks Detected
              </p>
              <h2 className="mono" style={{ fontSize: '2rem', fontWeight: 700, marginTop: '4px' }}>
                {loading && !summary ? '—' : summary?.total_attacks.toLocaleString() ?? '0'}
              </h2>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} color="#38bdf8" />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            In selected {windowOption} window
          </p>
        </div>

        {/* Card 2: Critical & High Severity */}
        <div className="soc-panel soc-panel-body" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                High & Critical Severity
              </p>
              <h2 className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--severity-critical)', marginTop: '4px' }}>
                {loading && !summary ? '—' : (criticalCount + highCount).toLocaleString()}
              </h2>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--severity-critical-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={20} color="var(--severity-critical)" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--severity-critical)' }}>
              Critical: <strong>{criticalCount}</strong>
            </span>
            <span style={{ color: 'var(--severity-high)' }}>
              High: <strong>{highCount}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Distinct Attacker IPs */}
        <div className="soc-panel soc-panel-body" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Distinct Source IPs
              </p>
              <h2 className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: '#a855f7', marginTop: '4px' }}>
                {loading && !summary ? '—' : summary?.distinct_sources_count.toLocaleString() ?? '0'}
              </h2>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color="#a855f7" />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Unique origin network endpoints
          </p>
        </div>

        {/* Card 4: Dominant Attack Vector */}
        <div className="soc-panel soc-panel-body" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Top Vector
              </p>
              <h2 className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', marginTop: '8px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                {loading && !summary ? '—' : topCategory}
              </h2>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crosshair size={20} color="#38bdf8" />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {topCategoryCount > 0 ? `${topCategoryCount} detections` : 'No category logged'}
          </p>
        </div>
      </div>
    </div>
  );
};
