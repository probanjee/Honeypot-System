/**
 * TypeScript API Contracts for Analytical Summaries (Phase 5)
 * Synchronized with services/backend/src/schemas/analytics.py
 */

export interface CategoryMetric {
  category: string;
  count: number;
}

export interface SignatureMetric {
  signature_id: string;
  rule_name: string;
  count: number;
}

export interface CountryMetric {
  country_code: string;
  country: string;
  count: number;
}

export interface TimeWindowInfo {
  window: string;
  start_time: string;
  end_time: string;
}

export interface SummaryAnalytics {
  total_attacks: number;
  distinct_sources_count: number;
  severity_breakdown: Record<string, number>;
  top_categories: CategoryMetric[];
  top_signatures: SignatureMetric[];
  top_countries: CountryMetric[];
  time_window: TimeWindowInfo;
}

export type TimeWindowOption = '1h' | '24h' | '7d';
