/**
 * Frontend Component Tests (Phase 5)
 * Verifies UI rendering, loading, empty, error, filter changes, and degraded GeoIP states.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../components/layout/Header';
import { SummaryCards } from '../components/analytics/SummaryCards';
import { LiveAttackFeed } from '../components/attacks/LiveAttackFeed';
import { AttackFiltersBar } from '../components/attacks/AttackFilters';
import { AttackDetailModal } from '../components/attacks/AttackDetailModal';
import { AttackGeoMap } from '../components/map/AttackGeoMap';
import type { AttackListItem } from '../types/attacks';
import type { SummaryAnalytics } from '../types/analytics';

const mockAttacks: AttackListItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    timestamp: '2026-10-26T12:00:00Z',
    ingested_at: '2026-10-26T12:00:01Z',
    source_ip: '198.51.100.1',
    source_port: 54321,
    is_private_ip: false,
    http_method: 'POST',
    request_path: '/api/v1/tournaments',
    protocol: 'HTTP/1.1',
    primary_category: 'SQL_INJECTION',
    severity_score: 85,
    severity_level: 'HIGH',
    geo_country: 'Germany',
    geo_country_code: 'DE',
    geo_city: 'Frankfurt',
    geo_latitude: 50.1109,
    geo_longitude: 8.6821,
    geoip_status: 'ENRICHED',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    timestamp: '2026-10-26T12:05:00Z',
    ingested_at: '2026-10-26T12:05:01Z',
    source_ip: '10.0.0.5',
    source_port: 33221,
    is_private_ip: true,
    http_method: 'GET',
    request_path: '/admin/login',
    protocol: 'HTTP/1.1',
    primary_category: 'BRUTE_FORCE',
    severity_score: 40,
    severity_level: 'LOW',
    geo_country: 'Unknown',
    geo_country_code: 'XX',
    geo_city: 'Unknown',
    geo_latitude: null,
    geo_longitude: null,
    geoip_status: 'UNAVAILABLE',
  },
];

const mockSummary: SummaryAnalytics = {
  total_attacks: 142,
  distinct_sources_count: 38,
  severity_breakdown: {
    CRITICAL: 12,
    HIGH: 35,
    MEDIUM: 60,
    LOW: 25,
    INFORMATIONAL: 10,
  },
  top_categories: [
    { category: 'SQL_INJECTION', count: 52 },
    { category: 'PATH_TRAVERSAL', count: 31 },
  ],
  top_signatures: [
    { signature_id: 'SQLI-001', rule_name: 'SQL Injection in Query', count: 52 },
  ],
  top_countries: [
    { country_code: 'DE', country: 'Germany', count: 45 },
  ],
  time_window: {
    window: '24h',
    start_time: '2026-10-25T12:00:00Z',
    end_time: '2026-10-26T12:00:00Z',
  },
};

describe('Header Component', () => {
  it('renders branding, connection statuses, and handles pause/refresh clicks', () => {
    const onTogglePause = vi.fn();
    const onRefreshAll = vi.fn();

    render(
      <Header
        backendReachable={true}
        streamStatus="CONNECTED"
        lastUpdated={new Date('2026-10-26T12:00:00Z')}
        isStreamPaused={false}
        onTogglePause={onTogglePause}
        onRefreshAll={onRefreshAll}
      />
    );

    expect(screen.getByText('VIGILANCE')).toBeInTheDocument();
    expect(screen.getByText('REST API:')).toBeInTheDocument();
    expect(screen.getByText('Kafka → SSE:')).toBeInTheDocument();
    expect(screen.getByText('Pause Feed')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Pause Feed'));
    expect(onTogglePause).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefreshAll).toHaveBeenCalledTimes(1);
  });
});

describe('SummaryCards Component', () => {
  it('displays actual backend aggregate values and supports time window selection', () => {
    const onChangeWindow = vi.fn();

    render(
      <SummaryCards
        summary={mockSummary}
        loading={false}
        error={null}
        windowOption="24h"
        onChangeWindow={onChangeWindow}
      />
    );

    expect(screen.getByText('142')).toBeInTheDocument(); // total attacks
    expect(screen.getByText('38')).toBeInTheDocument();  // distinct IPs
    expect(screen.getByText('47')).toBeInTheDocument();  // 12 critical + 35 high = 47
    expect(screen.getByText('SQL_INJECTION')).toBeInTheDocument(); // top vector

    fireEvent.click(screen.getByText('Last 1 Hour'));
    expect(onChangeWindow).toHaveBeenCalledWith('1h');
  });

  it('renders error state when error is provided', () => {
    render(
      <SummaryCards
        summary={null}
        loading={false}
        error="PostgreSQL query failed"
        windowOption="24h"
        onChangeWindow={vi.fn()}
      />
    );

    expect(screen.getByText(/Error loading analytical metrics: PostgreSQL query failed/)).toBeInTheDocument();
  });
});

describe('LiveAttackFeed Component', () => {
  it('renders attack rows with timestamps, severities, and IPs', () => {
    const onSelectAttack = vi.fn();

    render(
      <LiveAttackFeed
        liveAttacks={mockAttacks}
        historicalAttacks={mockAttacks}
        loading={false}
        error={null}
        isStreamPaused={false}
        hasMore={true}
        canPrev={false}
        pageNumber={1}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        onSelectAttack={onSelectAttack}
      />
    );

    expect(screen.getByText('198.51.100.1')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    expect(screen.getByText('RFC1918')).toBeInTheDocument();
    expect(screen.getByText('HIGH (85)')).toBeInTheDocument();

    // Click details button
    const detailButtons = screen.getAllByText('Details');
    fireEvent.click(detailButtons[0]);
    expect(onSelectAttack).toHaveBeenCalledWith(mockAttacks[0]);
  });

  it('renders empty state when no attacks are present', () => {
    render(
      <LiveAttackFeed
        liveAttacks={[]}
        historicalAttacks={[]}
        loading={false}
        error={null}
        isStreamPaused={false}
        hasMore={false}
        canPrev={false}
        pageNumber={1}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        onSelectAttack={vi.fn()}
      />
    );

    expect(screen.getByText('No attacks logged in this view')).toBeInTheDocument();
  });
});

describe('AttackFiltersBar Component', () => {
  it('calls onUpdateFilters on severity change and resets filters on Reset click', () => {
    const onUpdateFilters = vi.fn();
    const onResetFilters = vi.fn();

    render(
      <AttackFiltersBar
        filters={{ limit: 20 }}
        onUpdateFilters={onUpdateFilters}
        onResetFilters={onResetFilters}
      />
    );

    const severitySelect = screen.getByDisplayValue('All Severities');
    fireEvent.change(severitySelect, { target: { value: 'CRITICAL' } });
    expect(onUpdateFilters).toHaveBeenCalledWith({ severity: 'CRITICAL' });

    fireEvent.click(screen.getByText('Reset'));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });
});

describe('AttackDetailModal Component', () => {
  it('renders selected attack details and handles close action', () => {
    const onClose = vi.fn();

    render(
      <AttackDetailModal
        attack={mockAttacks[0]}
        onClose={onClose}
      />
    );

    expect(screen.getByText('INCIDENT DETAIL FORENSICS')).toBeInTheDocument();
    expect(screen.getByText(/198.51.100.1:54321/)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/v1\/tournaments/)).toBeInTheDocument();
    expect(screen.getByText(/Frankfurt/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AttackGeoMap Component', () => {
  it('displays disclaimer and explains private RFC1918 addresses', () => {
    render(<AttackGeoMap attacks={mockAttacks} />);

    expect(screen.getByText('Global Attack Surface')).toBeInTheDocument();
    expect(screen.getByText(/approximate regional GeoIP resolutions/i)).toBeInTheDocument();
    expect(screen.getByText(/RFC 1918 private IPs are bypassed/i)).toBeInTheDocument();
  });
});
