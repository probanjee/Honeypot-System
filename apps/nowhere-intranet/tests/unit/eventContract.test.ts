/**
 * VIGILANCE Event Contract Unit Tests
 * Verifies versioned RawAttackEvent v1.0.0 validation and mapping.
 */

import { describe, it, expect } from 'vitest';
import { validateRawAttackEvent, createRawAttackEvent, RawAttackEvent } from '../../src/events/eventContract.js';
import { RawEvidenceRecord } from '../../src/models/types.js';

describe('Event Contract & Schema Validation (RawAttackEvent v1.0.0)', () => {
  const validEvent: RawAttackEvent = {
    event_id: 'a8098c1a-f86e-11da-bd1a-00112444be1e',
    mongo_raw_id: '67bb2d348911ab0012e84511',
    schema_version: '1.0.0',
    timestamp: '2026-10-25T00:00:00.000Z',
    event_type: 'RAW_ATTACK_DETECTED',
    source: {
      ip: '198.51.100.42',
      port: 49152,
    },
    detection: {
      severity_score: 85,
      severity_level: 'HIGH',
      matched_rules: [
        {
          rule_id: 'SIG-SQLI-001',
          rule_name: 'Classic SQL Injection',
          category: 'SQL_INJECTION',
          weight: 35,
        },
      ],
    },
    request: {
      method: 'GET',
      path: '/tournaments',
      protocol: 'HTTP/1.1',
      headers: { 'user-agent': 'sqlmap/1.7' },
      raw_payload: null,
      truncated: false,
    },
  };

  it('validates a completely valid RawAttackEvent envelope', () => {
    const res = validateRawAttackEvent(validEvent);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.event?.event_id).toBe(validEvent.event_id);
  });

  it('rejects null or non-object payloads safely', () => {
    expect(validateRawAttackEvent(null).valid).toBe(false);
    expect(validateRawAttackEvent(undefined).valid).toBe(false);
    expect(validateRawAttackEvent('string').valid).toBe(false);
  });

  it('rejects an invalid or non-UUIDv4 event_id', () => {
    const invalid = { ...validEvent, event_id: 'not-a-uuid' };
    const res = validateRawAttackEvent(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('UUIDv4'))).toBe(true);
  });

  it('rejects an unsupported schema version', () => {
    const invalid = { ...validEvent, schema_version: '2.0.0' };
    const res = validateRawAttackEvent(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('schema_version'))).toBe(true);
  });

  it('rejects unparseable timestamps', () => {
    const invalid = { ...validEvent, timestamp: 'invalid-date' };
    const res = validateRawAttackEvent(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('timestamp'))).toBe(true);
  });

  it('rejects out-of-bounds severity scores (>100 or <0)', () => {
    const invalidHigh = {
      ...validEvent,
      detection: { ...validEvent.detection, severity_score: 150 },
    };
    expect(validateRawAttackEvent(invalidHigh).valid).toBe(false);

    const invalidLow = {
      ...validEvent,
      detection: { ...validEvent.detection, severity_score: -5 },
    };
    expect(validateRawAttackEvent(invalidLow).valid).toBe(false);
  });

  it('rejects invalid severity level enums', () => {
    const invalid = {
      ...validEvent,
      detection: { ...validEvent.detection, severity_level: 'SUPER_CRITICAL' },
    };
    const res = validateRawAttackEvent(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('severity_level'))).toBe(true);
  });

  it('correctly maps a RawEvidenceRecord to a valid RawAttackEvent envelope', () => {
    const rawRecord: RawEvidenceRecord = {
      event_id: 'a8098c1a-f86e-11da-bd1a-00112444be1e',
      timestamp: new Date('2026-10-25T01:00:00Z'),
      publish_status: 'PENDING',
      retry_count: 0,
      client: {
        remote_ip: '203.0.113.15',
        remote_port: 54321,
        user_agent: 'Mozilla/5.0',
      },
      request: {
        method: 'POST',
        url: '/admin/login',
        path: '/admin/login',
        query: {},
        headers: { host: 'localhost:3000' },
        body_raw: 'admin=true&pass=test[TRUNCATED_AT_4KB]',
        payload_size_bytes: 4096,
      },
      detection: {
        severity_score: 50,
        severity_level: 'MEDIUM',
        applied_modifiers: ['CANARY_PATH'],
        matched_signatures: [
          {
            rule_id: 'SIG-AUTH-001',
            rule_name: 'Admin Probe',
            category: 'CREDENTIAL_STUFFING',
            severity_weight: 30,
            matched_location: 'body',
            extracted_sample: 'admin=true',
          },
        ],
      },
    };

    const event = createRawAttackEvent(rawRecord, 'mock_mongo_id_123');
    const validation = validateRawAttackEvent(event);

    expect(validation.valid).toBe(true);
    expect(event.mongo_raw_id).toBe('mock_mongo_id_123');
    expect(event.source.ip).toBe('203.0.113.15');
    expect(event.request.truncated).toBe(true);
    expect(event.detection.matched_rules[0].rule_id).toBe('SIG-AUTH-001');
  });
});
