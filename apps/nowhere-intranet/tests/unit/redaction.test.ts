/**
 * VIGILANCE Nowhere Esports Intranet - Redaction Engine Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { redactHeaders, redactObject, boundAndRedactRawBody } from '../../src/engine/redaction.js';

describe('Sensitive Data Redaction Engine', () => {
  describe('redactHeaders()', () => {
    it('redacts Authorization and Cookie headers while preserving benign headers', () => {
      const headers = {
        'host': 'intranet.nowhere-esports.local',
        'user-agent': 'sqlmap/1.7',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'cookie': 'session_token=abcdef123456789; logged_in=true',
        'x-api-key': 'secret-prod-api-key-9988',
      };

      const sanitized = redactHeaders(headers);

      expect(sanitized['host']).toBe('intranet.nowhere-esports.local');
      expect(sanitized['user-agent']).toBe('sqlmap/1.7');
      expect(sanitized['authorization']).toBe('[REDACTED_SECRET]');
      expect(sanitized['cookie']).toBe('[REDACTED_COOKIE]');
      expect(sanitized['x-api-key']).toBe('[REDACTED_SECRET]');
      expect(sanitized['authorization']).not.toContain('eyJhbGci');
      expect(sanitized['cookie']).not.toContain('abcdef123456789');
    });
  });

  describe('redactObject()', () => {
    it('redacts sensitive keys in nested object payloads', () => {
      const payload = {
        username: 'admin',
        password: 'SuperSecretPassword123!',
        token: 'auth-jwt-sample',
        metadata: {
          client_ip: '198.51.100.42',
          apiKey: 'internal-secret-key',
        },
      };

      const sanitized = redactObject(payload);

      expect(sanitized.username).toBe('admin');
      expect(sanitized.password).toBe('[REDACTED_SECRET]');
      expect(sanitized.token).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.client_ip).toBe('198.51.100.42');
      expect(sanitized.metadata.apiKey).toBe('[REDACTED_SECRET]');
    });
  });

  describe('boundAndRedactRawBody()', () => {
    it('truncates oversized payloads exceeding 4096 bytes and appends indicator', () => {
      const hugeString = 'A'.repeat(5000);
      const { text, bytes } = boundAndRedactRawBody(hugeString, 4096);

      expect(bytes).toBe(5000);
      expect(text?.length).toBeLessThan(5000);
      expect(text).toContain('[TRUNCATED_AT_4KB]');
    });

    it('returns benign short payloads untruncated', () => {
      const normal = 'name=PlayerOne&game=Valorant';
      const { text, bytes } = boundAndRedactRawBody(normal, 4096);

      expect(bytes).toBe(normal.length);
      expect(text).toBe(normal);
    });
  });
});
