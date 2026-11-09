/**
 * React Hook for Summary Analytics (Phase 5)
 * Consumes GET /api/v1/analytics/summary with sliding time window options.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SummaryAnalytics, TimeWindowOption } from '../types/analytics';
import { vigilanceApi } from '../services/api';

export function useAnalytics(initialWindow: TimeWindowOption = '24h') {
  const [windowOption, setWindowOption] = useState<TimeWindowOption>(initialWindow);
  const [summary, setSummary] = useState<SummaryAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSummary = useCallback(async (selectedWindow: TimeWindowOption) => {
    setLoading(true);
    setError(null);
    try {
      const data = await vigilanceApi.getSummaryAnalytics(selectedWindow);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve analytics summary';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(windowOption);

    // Auto-refresh summary data every 45 seconds
    const interval = setInterval(() => {
      fetchSummary(windowOption);
    }, 45000);

    return () => clearInterval(interval);
  }, [windowOption, fetchSummary]);

  const changeWindow = useCallback((newWindow: TimeWindowOption) => {
    setWindowOption(newWindow);
  }, []);

  const refresh = useCallback(() => {
    fetchSummary(windowOption);
  }, [windowOption, fetchSummary]);

  return {
    summary,
    windowOption,
    changeWindow,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
