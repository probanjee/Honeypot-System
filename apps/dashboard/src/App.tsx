/**
 * VIGILANCE Enterprise Honeypot SOC Dashboard (Phase 5)
 * Main Application Component coordinating live SSE telemetry,
 * REST analytics, cursor-paginated attack records, and interactive threat maps.
 */

import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { SummaryCards } from './components/analytics/SummaryCards';
import { SeverityCharts } from './components/analytics/SeverityCharts';
import { AttackGeoMap } from './components/map/AttackGeoMap';
import { AttackFiltersBar } from './components/attacks/AttackFilters';
import { LiveAttackFeed } from './components/attacks/LiveAttackFeed';
import { AttackDetailModal } from './components/attacks/AttackDetailModal';
import { useHealth } from './hooks/useHealth';
import { useAnalytics } from './hooks/useAnalytics';
import { useAttacks } from './hooks/useAttacks';
import { useSSEStream } from './hooks/useSSEStream';
import type { AttackListItem } from './types/attacks';

export const App: React.FC = () => {
  // 1. Backend & Component Health
  const { isBackendReachable, checkHealth } = useHealth();

  // 2. Analytical Metrics
  const {
    summary,
    windowOption,
    changeWindow,
    loading: analyticsLoading,
    error: analyticsError,
    lastUpdated,
    refresh: refreshAnalytics,
  } = useAnalytics('24h');

  // 3. Historical Attack Database
  const {
    attacks: historicalAttacks,
    filters,
    updateFilters,
    resetFilters,
    nextPage,
    prevPage,
    hasMore,
    canPrev,
    pageNumber,
    loading: attacksLoading,
    error: attacksError,
    refresh: refreshAttacks,
  } = useAttacks({ limit: 20 });

  // 4. Real-Time Kafka → SSE Live Stream
  const {
    liveAttacks,
    streamState,
    isPaused: isStreamPaused,
    togglePause: onTogglePause,
  } = useSSEStream(200);

  // 5. Selected Attack for Forensic Detail Modal
  const [selectedAttack, setSelectedAttack] = useState<AttackListItem | null>(null);

  // Global Refresh Handler
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([checkHealth(), refreshAnalytics(), refreshAttacks()]);
    setIsRefreshing(false);
  };

  // Combine live attacks with historical attacks for the map visualization
  // Deduplicate by ID
  const combinedMapAttacks = React.useMemo(() => {
    const map = new Map<string, AttackListItem>();
    liveAttacks.forEach((a) => map.set(a.id, a));
    historicalAttacks.forEach((a) => {
      if (!map.has(a.id)) map.set(a.id, a);
    });
    return Array.from(map.values());
  }, [liveAttacks, historicalAttacks]);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 20px' }}>
      {/* 1. Header & Live Connection Status */}
      <Header
        backendReachable={isBackendReachable}
        streamStatus={streamState.status}
        lastUpdated={lastUpdated}
        isStreamPaused={isStreamPaused}
        onTogglePause={onTogglePause}
        onRefreshAll={handleRefreshAll}
        isRefreshing={isRefreshing}
      />

      {/* 2. Analytical Summary Metrics */}
      <SummaryCards
        summary={summary}
        loading={analyticsLoading}
        error={analyticsError}
        windowOption={windowOption}
        onChangeWindow={changeWindow}
      />

      {/* 3. Middle Section: Severity Visualizations + Geographic Map */}
      <SeverityCharts summary={summary} loading={analyticsLoading} />

      <AttackGeoMap
        attacks={combinedMapAttacks}
        onSelectAttack={(attack) => setSelectedAttack(attack)}
      />

      {/* 4. Bottom Section: Search & Filters + Live Attack Feed Table */}
      <div className="soc-panel" style={{ overflow: 'hidden' }}>
        <div className="soc-panel-header">
          <div className="soc-panel-title">
            <span>Threat Activity Stream & Archive</span>
          </div>
        </div>

        <AttackFiltersBar
          filters={filters}
          onUpdateFilters={updateFilters}
          onResetFilters={resetFilters}
        />

        <LiveAttackFeed
          liveAttacks={liveAttacks}
          historicalAttacks={historicalAttacks}
          loading={attacksLoading}
          error={attacksError}
          isStreamPaused={isStreamPaused}
          hasMore={hasMore}
          canPrev={canPrev}
          pageNumber={pageNumber}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          onSelectAttack={(attack) => setSelectedAttack(attack)}
        />
      </div>

      {/* 5. Forensic Detail Modal */}
      <AttackDetailModal
        attack={selectedAttack}
        onClose={() => setSelectedAttack(null)}
      />
    </div>
  );
};

export default App;
