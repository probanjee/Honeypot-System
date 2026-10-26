/**
 * Severity & Category Analytical Visualizations (Phase 5)
 * Visualizes attack distribution across severity tiers and top exploit categories
 * using responsive, accessible SVG graphics with cybersecurity dark-mode styling.
 */

import React from 'react';
import { PieChart, BarChart2 } from 'lucide-react';
import type { SummaryAnalytics } from '../../types/analytics';

interface SeverityChartsProps {
  summary: SummaryAnalytics | null;
  loading: boolean;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
  HIGH: { label: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' },
  MEDIUM: { label: 'Medium', color: '#eab308', bg: 'rgba(234, 179, 8, 0.2)' },
  LOW: { label: 'Low', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)' },
  INFORMATIONAL: { label: 'Info', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
};

export const SeverityCharts: React.FC<SeverityChartsProps> = ({ summary, loading }) => {
  const total = summary?.total_attacks || 0;
  const breakdown = summary?.severity_breakdown || {};
  const topCategories = summary?.top_categories?.slice(0, 5) || [];

  // Calculate SVG Donut slices
  let accumulatedAngle = 0;
  const donutRadius = 65;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * donutRadius;

  const severitySlices = Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
    const count = breakdown[key] || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedAngle / 360) * circumference);
    accumulatedAngle += (percentage / 100) * 360;

    return {
      key,
      count,
      percentage: percentage.toFixed(1),
      strokeDasharray,
      strokeDashoffset,
      ...config,
    };
  });

  const maxCategoryCount = topCategories.length > 0 ? Math.max(...topCategories.map((c) => c.count), 1) : 1;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}
    >
      {/* Chart 1: Severity Distribution Donut */}
      <div className="soc-panel">
        <div className="soc-panel-header">
          <div className="soc-panel-title">
            <PieChart size={16} color="#38bdf8" />
            <span>Severity Distribution</span>
          </div>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total: {total.toLocaleString()}
          </span>
        </div>

        <div className="soc-panel-body">
          {loading && !summary ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading severity metrics...
            </div>
          ) : total === 0 ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No attacks detected in selected window.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={strokeWidth}
                  />
                  {/* Slices */}
                  {severitySlices.map((slice) =>
                    slice.count > 0 ? (
                      <circle
                        key={slice.key}
                        cx="80"
                        cy="80"
                        r={donutRadius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="butt"
                      />
                    ) : null
                  )}
                </svg>

                {/* Center metric */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {total}
                  </span>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Events
                  </span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                {severitySlices.map((slice) => (
                  <div key={slice.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          backgroundColor: slice.color,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{slice.label}</span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.8125rem' }}>
                      <strong>{slice.count}</strong>{' '}
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>({slice.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Top Attack Categories */}
      <div className="soc-panel">
        <div className="soc-panel-header">
          <div className="soc-panel-title">
            <BarChart2 size={16} color="#a855f7" />
            <span>Top Attack Categories</span>
          </div>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            By Frequency
          </span>
        </div>

        <div className="soc-panel-body">
          {loading && !summary ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading categories...
            </div>
          ) : topCategories.length === 0 ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No classified attack categories yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topCategories.map((cat, idx) => {
                const widthPercent = Math.max(5, (cat.count / maxCategoryCount) * 100);
                return (
                  <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {idx + 1}. {cat.category}
                      </span>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>
                        <strong>{cat.count}</strong> attacks
                      </span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #38bdf8, #a855f7)',
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
