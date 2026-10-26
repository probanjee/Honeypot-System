/**
 * Centralized REST API Client for VIGILANCE Backend (Phase 5)
 * Handles typed requests, query parameter encoding, error formatting, and timeout management.
 */

import type { AttackDetail, AttackFilters, AttackSignature, PaginatedAttacks } from '../types/attacks';
import type { SummaryAnalytics, TimeWindowOption } from '../types/analytics';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
        errorDetail = String((errorData as { detail: unknown }).detail);
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(errorDetail, response.status, errorData);
  }

  return response.json() as Promise<T>;
}

export const vigilanceApi = {
  /**
   * Fetches cursor-paginated attacks with server-side filters.
   */
  async getAttacks(filters: AttackFilters = {}): Promise<PaginatedAttacks> {
    const params = new URLSearchParams();
    if (filters.limit !== undefined) params.append('limit', String(filters.limit));
    if (filters.cursor) params.append('cursor', filters.cursor);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.min_score !== undefined) params.append('min_score', String(filters.min_score));
    if (filters.max_score !== undefined) params.append('max_score', String(filters.max_score));
    if (filters.signature) params.append('signature', filters.signature);
    if (filters.source_ip) params.append('source_ip', filters.source_ip);
    if (filters.country) params.append('country', filters.country);
    if (filters.start_time) params.append('start_time', filters.start_time);
    if (filters.end_time) params.append('end_time', filters.end_time);
    if (filters.sort) params.append('sort', filters.sort);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<PaginatedAttacks>(`/attacks${queryString}`);
  },

  /**
   * Fetches comprehensive details for a single attack.
   */
  async getAttackDetail(id: string): Promise<AttackDetail> {
    return fetchJson<AttackDetail>(`/attacks/${encodeURIComponent(id)}`);
  },

  /**
   * Fetches granular signatures matched by an attack.
   */
  async getAttackSignatures(id: string): Promise<AttackSignature[]> {
    return fetchJson<AttackSignature[]>(`/attacks/${encodeURIComponent(id)}/signatures`);
  },

  /**
   * Fetches analytical summary metrics across the requested time window.
   */
  async getSummaryAnalytics(window: TimeWindowOption = '24h'): Promise<SummaryAnalytics> {
    return fetchJson<SummaryAnalytics>(`/analytics/summary?window=${encodeURIComponent(window)}`);
  },

  /**
   * Probes backend health and database connectivity.
   */
  async getHealth(): Promise<{ status: string; service: string; version: string; components: Record<string, unknown> }> {
    return fetchJson<{ status: string; service: string; version: string; components: Record<string, unknown> }>('/health');
  },
};
