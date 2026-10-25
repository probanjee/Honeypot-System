/**
 * VIGILANCE Event Contract & Schema Validation
 * Specification: docs/api/event-schemas.md (Draft 7, schema_version: "1.0.0")
 */

import { RawEvidenceRecord } from '../models/types.js';

export interface MatchedRulePayload {
  rule_id: string;
  rule_name: string;
  category: string;
  weight: number;
}

export interface RawAttackEvent {
  event_id: string;
  mongo_raw_id: string;
  schema_version: '1.0.0';
  timestamp: string; // ISO 8601
  event_type: 'RAW_ATTACK_DETECTED';
  source: {
    ip: string;
    port: number;
  };
  detection: {
    severity_score: number;
    severity_level: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    matched_rules: MatchedRulePayload[];
  };
  request: {
    method: string;
    path: string;
    protocol: string;
    headers: Record<string, string>;
    raw_payload: string | null;
    truncated: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  event?: RawAttackEvent;
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_SEVERITIES = new Set(['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

/**
 * Validates an arbitrary payload against the RawAttackEvent v1.0.0 contract.
 * Returns detailed structural errors without throwing runtime exceptions.
 */
export function validateRawAttackEvent(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be a non-null object'] };
  }

  const obj = payload as Record<string, unknown>;

  // 1. Envelope validations
  if (!obj.event_id || typeof obj.event_id !== 'string') {
    errors.push('Field "event_id" is required and must be a string');
  } else if (!UUID_V4_REGEX.test(obj.event_id)) {
    errors.push(`Field "event_id" (${obj.event_id}) is not a valid UUIDv4 format`);
  }

  if (!obj.mongo_raw_id || typeof obj.mongo_raw_id !== 'string') {
    errors.push('Field "mongo_raw_id" is required and must be a string');
  }

  if (obj.schema_version !== '1.0.0') {
    errors.push(`Field "schema_version" must be exact string "1.0.0", received: "${obj.schema_version}"`);
  }

  if (!obj.timestamp || typeof obj.timestamp !== 'string' || isNaN(Date.parse(obj.timestamp))) {
    errors.push('Field "timestamp" is required and must be a valid ISO-8601 date-time string');
  }

  if (obj.event_type !== 'RAW_ATTACK_DETECTED') {
    errors.push(`Field "event_type" must be "RAW_ATTACK_DETECTED", received: "${obj.event_type}"`);
  }

  // 2. Source validations
  if (!obj.source || typeof obj.source !== 'object') {
    errors.push('Field "source" is required and must be an object');
  } else {
    const src = obj.source as Record<string, unknown>;
    if (!src.ip || typeof src.ip !== 'string') {
      errors.push('Field "source.ip" is required and must be a string');
    }
    if (typeof src.port !== 'number' || src.port < 0 || src.port > 65535) {
      errors.push('Field "source.port" is required and must be an integer between 0 and 65535');
    }
  }

  // 3. Detection validations
  if (!obj.detection || typeof obj.detection !== 'object') {
    errors.push('Field "detection" is required and must be an object');
  } else {
    const det = obj.detection as Record<string, unknown>;
    if (typeof det.severity_score !== 'number' || det.severity_score < 0 || det.severity_score > 100) {
      errors.push('Field "detection.severity_score" is required and must be a number between 0 and 100');
    }
    if (!det.severity_level || typeof det.severity_level !== 'string' || !VALID_SEVERITIES.has(det.severity_level)) {
      errors.push('Field "detection.severity_level" is required and must be one of: INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL');
    }
    if (!Array.isArray(det.matched_rules)) {
      errors.push('Field "detection.matched_rules" is required and must be an array');
    } else {
      for (let i = 0; i < det.matched_rules.length; i++) {
        const r = det.matched_rules[i];
        if (!r || typeof r !== 'object' || !r.rule_id || !r.rule_name || !r.category || typeof r.weight !== 'number') {
          errors.push(`detection.matched_rules[${i}] is missing required fields (rule_id, rule_name, category, weight)`);
        }
      }
    }
  }

  // 4. Request validations
  if (!obj.request || typeof obj.request !== 'object') {
    errors.push('Field "request" is required and must be an object');
  } else {
    const req = obj.request as Record<string, unknown>;
    if (!req.method || typeof req.method !== 'string') {
      errors.push('Field "request.method" is required and must be a string');
    }
    if (!req.path || typeof req.path !== 'string') {
      errors.push('Field "request.path" is required and must be a string');
    }
    if (!req.protocol || typeof req.protocol !== 'string') {
      errors.push('Field "request.protocol" is required and must be a string');
    }
    if (!req.headers || typeof req.headers !== 'object') {
      errors.push('Field "request.headers" is required and must be an object');
    }
    if (typeof req.truncated !== 'boolean') {
      errors.push('Field "request.truncated" is required and must be a boolean');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], event: obj as unknown as RawAttackEvent };
}

/**
 * Maps a MongoDB RawEvidenceRecord to a canonical RawAttackEvent v1.0.0 envelope.
 */
export function createRawAttackEvent(evidence: RawEvidenceRecord, mongoRawId: string): RawAttackEvent {
  const isTruncated = (evidence.request.body_raw || '').includes('[TRUNCATED_AT_4KB]');

  return {
    event_id: evidence.event_id,
    mongo_raw_id: mongoRawId,
    schema_version: '1.0.0',
    timestamp: (evidence.timestamp instanceof Date ? evidence.timestamp : new Date(evidence.timestamp)).toISOString(),
    event_type: 'RAW_ATTACK_DETECTED',
    source: {
      ip: evidence.client.remote_ip,
      port: evidence.client.remote_port || 0,
    },
    detection: {
      severity_score: evidence.detection.severity_score,
      severity_level: evidence.detection.severity_level,
      matched_rules: evidence.detection.matched_signatures.map((s) => ({
        rule_id: s.rule_id,
        rule_name: s.rule_name,
        category: s.category,
        weight: s.severity_weight,
      })),
    },
    request: {
      method: evidence.request.method,
      path: evidence.request.path,
      protocol: 'HTTP/1.1',
      headers: evidence.request.headers || {},
      raw_payload: evidence.request.body_raw,
      truncated: isTruncated,
    },
  };
}
