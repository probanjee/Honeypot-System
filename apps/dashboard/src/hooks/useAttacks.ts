/**
 * React Hook for Historical & Paginated Attack Queries (Phase 5)
 * Manages keyset cursor pagination, query filters, loading, and error states.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AttackFilters, AttackListItem, PaginatedAttacks } from '../types/attacks';
import { vigilanceApi } from '../services/api';

export function useAttacks(initialFilters: AttackFilters = {}) {
  const [attacks, setAttacks] = useState<AttackListItem[]>([]);
  const [filters, setFilters] = useState<AttackFilters>(initialFilters);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Request counter to cancel / ignore out-of-order stale responses
  const activeRequestId = useRef(0);

  const fetchPage = useCallback(async (currentFilters: AttackFilters, cursor?: string) => {
    const requestId = ++activeRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const response: PaginatedAttacks = await vigilanceApi.getAttacks({
        ...currentFilters,
        cursor,
      });

      if (requestId === activeRequestId.current) {
        setAttacks(response.items);
        setNextCursor(response.next_cursor);
        setHasMore(response.has_more);
      }
    } catch (err) {
      if (requestId === activeRequestId.current) {
        const msg = err instanceof Error ? err.message : 'Failed to query attack records';
        setError(msg);
        setAttacks([]);
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch when filters or page index change
  useEffect(() => {
    const currentCursor = cursorHistory[currentPageIndex];
    fetchPage(filters, currentCursor);
  }, [filters, currentPageIndex, cursorHistory, fetchPage]);

  const updateFilters = useCallback((newFilters: Partial<AttackFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      cursor: undefined, // Reset cursor on filter changes
    }));
    // Reset pagination history to first page
    setCursorHistory([undefined]);
    setCurrentPageIndex(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ limit: 20 });
    setCursorHistory([undefined]);
    setCurrentPageIndex(0);
  }, []);

  const nextPage = useCallback(() => {
    if (!hasMore || !nextCursor) return;
    setCursorHistory((prev) => [...prev, nextCursor]);
    setCurrentPageIndex((prev) => prev + 1);
  }, [hasMore, nextCursor]);

  const prevPage = useCallback(() => {
    if (currentPageIndex <= 0) return;
    setCurrentPageIndex((prev) => prev - 1);
  }, [currentPageIndex]);

  const refresh = useCallback(() => {
    const currentCursor = cursorHistory[currentPageIndex];
    fetchPage(filters, currentCursor);
  }, [cursorHistory, currentPageIndex, filters, fetchPage]);

  return {
    attacks,
    filters,
    updateFilters,
    resetFilters,
    nextPage,
    prevPage,
    hasMore,
    canPrev: currentPageIndex > 0,
    pageNumber: currentPageIndex + 1,
    loading,
    error,
    refresh,
  };
}
