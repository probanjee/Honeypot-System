/**
 * TypeScript API Contracts for Attack Records and Filtering (Phase 5)
 * Synchronized strictly with FastAPI backend schemas (services/backend/src/schemas/attacks.py)
 */

export type SeverityLevel = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AttackSignature {
  id: string;
  signature_id: string;
  rule_name: string;
  category: string;
  weight: number;
  created_at: string;
}

export interface AttackListItem {
  id: string;
  timestamp: string;
  ingested_at: string;
  source_ip: string;
  source_port: number;
  is_private_ip: boolean;
  http_method: string;
  request_path: string;
  protocol: string;
  primary_category: string;
  severity_score: number;
  severity_level: SeverityLevel;
  geo_country: string;
  geo_country_code: string;
  geo_city: string;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geoip_status: string;
}

export interface AttackDetail extends AttackListItem {
  user_agent: string | null;
  detection_summary: {
    matched_rule_count?: number;
    matched_rule_ids?: string[];
    [key: string]: unknown;
  };
  processing_metadata: {
    ingestion_service?: string;
    ingestion_version?: string;
    [key: string]: unknown;
  };
  threat_actor_id: string | null;
  mongo_raw_id: string;
  schema_version: string;
  signatures: AttackSignature[];
}

export interface PaginatedAttacks {
  items: AttackListItem[];
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

export interface AttackFilters {
  limit?: number;
  cursor?: string;
  severity?: SeverityLevel;
  min_score?: number;
  max_score?: number;
  signature?: string;
  source_ip?: string;
  country?: string;
  start_time?: string;
  end_time?: string;
  sort?: 'desc' | 'asc';
}
