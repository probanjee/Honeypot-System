/**
 * VIGILANCE Nowhere Esports Intranet - Type Definitions
 * Phase 1: Honeypot Sensor & Detection Types
 */

export type SeverityLevel = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OutboxStatus = 'PENDING' | 'CLAIMED' | 'PUBLISHED' | 'FAILED';

export interface MatchedSignature {
  rule_id: string;
  rule_name: string;
  category: string;
  severity_weight: number;
  matched_location: string;
  extracted_sample: string;
}

export interface SeverityResult {
  base_score: number;
  context_modifier: number;
  raw_score: number;
  clamped_score: number;
  severity_level: SeverityLevel;
  applied_modifiers: string[];
}

export interface SecurityContext {
  event_id: string;
  timestamp: Date;
  is_suspicious: boolean;
  severity: SeverityResult;
  matched_signatures: MatchedSignature[];
  mongo_raw_id?: string;
}

export interface RequestEvidenceSnapshot {
  method: string;
  url: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body_raw: string | null;
  payload_size_bytes: number;
}

export interface ClientMetadata {
  remote_ip: string;
  remote_port: number;
  user_agent: string;
}

export interface RawEvidenceRecord {
  id?: string;
  event_id: string;
  timestamp: Date;
  publish_status: OutboxStatus;
  published_at?: Date | null;
  claimed_at?: Date | null;
  claimed_by?: string | null;
  last_error?: string | null;
  retry_count: number;
  request: RequestEvidenceSnapshot;
  client: ClientMetadata;
  detection: {
    matched_signatures: MatchedSignature[];
    severity_score: number;
    severity_level: SeverityLevel;
    applied_modifiers: string[];
  };
}

export interface RuleMatchingLogic {
  type: 'regex' | 'custom';
  patterns?: string[];
  rule_handler?: string;
}

export interface RuleDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  severity_weight: number;
  enabled: boolean;
  locations: string[];
  matching_logic: RuleMatchingLogic;
  false_positive_considerations?: string;
  test_cases?: {
    positive?: string[];
    negative?: string[];
  };
}

export interface RulesConfig {
  rules: RuleDefinition[];
}
