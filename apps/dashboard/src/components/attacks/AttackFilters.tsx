/**
 * Attack Filter & Search Controls (Phase 5)
 * Synchronized with backend query parameters: severity, score range, source IP,
 * country code, and page size.
 */

import React, { useState } from 'react';
import { Filter, Search, RotateCcw } from 'lucide-react';
import type { AttackFilters, SeverityLevel } from '../../types/attacks';

interface AttackFiltersProps {
  filters: AttackFilters;
  onUpdateFilters: (newFilters: Partial<AttackFilters>) => void;
  onResetFilters: () => void;
}

export const AttackFiltersBar: React.FC<AttackFiltersProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
}) => {
  const [ipInput, setIpInput] = useState(filters.source_ip || '');
  const [countryInput, setCountryInput] = useState(filters.country || '');
  const [sigInput, setSigInput] = useState(filters.signature || '');

  const handleIpSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFilters({ source_ip: ipInput.trim() || undefined });
  };

  const handleCountryChange = (val: string) => {
    const clean = val.toUpperCase().slice(0, 2);
    setCountryInput(clean);
    onUpdateFilters({ country: clean || undefined });
  };

  const handleReset = () => {
    setIpInput('');
    setCountryInput('');
    setSigInput('');
    onResetFilters();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 18px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <Filter size={15} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Filter:</span>
        </div>

        {/* Severity Selector */}
        <select
          value={filters.severity || ''}
          onChange={(e) => onUpdateFilters({ severity: (e.target.value as SeverityLevel) || undefined })}
          className="soc-input"
          style={{ minWidth: '130px' }}
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFORMATIONAL">Informational</option>
        </select>

        {/* Source IP Search Form */}
        <form onSubmit={handleIpSearch} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search Source IP..."
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              className="soc-input mono"
              style={{ paddingRight: '28px', width: '160px' }}
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={14} />
            </button>
          </div>
        </form>

        {/* Country Code Filter */}
        <input
          type="text"
          placeholder="Country (e.g. DE)"
          value={countryInput}
          maxLength={2}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="soc-input mono"
          style={{ width: '110px', textTransform: 'uppercase' }}
        />

        {/* Score Threshold Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min Score:</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={filters.min_score !== undefined ? filters.min_score : ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
              onUpdateFilters({ min_score: val });
            }}
            className="soc-input mono"
            style={{ width: '64px' }}
          />
        </div>

        {/* Signature Filter */}
        <input
          type="text"
          placeholder="Signature ID..."
          value={sigInput}
          onChange={(e) => {
            setSigInput(e.target.value);
            onUpdateFilters({ signature: e.target.value.trim() || undefined });
          }}
          className="soc-input mono"
          style={{ width: '130px' }}
        />
      </div>

      {/* Right: Reset Action & Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <select
          value={filters.sort || 'desc'}
          onChange={(e) => onUpdateFilters({ sort: e.target.value as 'desc' | 'asc' })}
          className="soc-input"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>

        <select
          value={filters.limit || 20}
          onChange={(e) => onUpdateFilters({ limit: parseInt(e.target.value, 10) })}
          className="soc-input"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>

        <button onClick={handleReset} className="soc-btn" title="Reset all filters">
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
