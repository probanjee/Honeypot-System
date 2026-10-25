/**
 * VIGILANCE Nowhere Esports Intranet - Normalizer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { safeUrlDecode, normalizeForInspection, MAX_INSPECTION_BYTES } from '../../src/engine/normalizer.js';

describe('Payload Normalizer & Safe Decoding', () => {
  describe('safeUrlDecode()', () => {
    it('decodes standard percent-encoded characters correctly', () => {
      const input = 'admin%27%20OR%201%3D1--';
      expect(safeUrlDecode(input)).toBe("admin' OR 1=1--");
    });

    it('handles benign strings without percent signs unchanged', () => {
      const input = 'tournaments-apex-2026';
      expect(safeUrlDecode(input)).toBe(input);
    });

    it('safely handles malformed percent sequences without crashing', () => {
      // Malformed UTF-8 sequence that would crash naive decodeURIComponent
      const malformed = 'search=%E0%A4%A&page=1';
      expect(() => safeUrlDecode(malformed)).not.toThrow();
      const result = safeUrlDecode(malformed);
      expect(typeof result).toBe('string');
    });
  });

  describe('normalizeForInspection()', () => {
    it('collapses multiple whitespace characters and trims', () => {
      const input = '  SELECT   *    FROM     users   ';
      expect(normalizeForInspection(input)).toBe('SELECT * FROM users');
    });

    it('strips null bytes from input', () => {
      const input = '/admin\x00/config';
      expect(normalizeForInspection(input)).toBe('/admin /config');
    });

    it('bounds payload to MAX_INSPECTION_BYTES', () => {
      const hugeInput = 'A'.repeat(MAX_INSPECTION_BYTES + 2000);
      const normalized = normalizeForInspection(hugeInput);
      expect(normalized.length).toBeLessThanOrEqual(MAX_INSPECTION_BYTES);
    });

    it('handles null and undefined gracefully', () => {
      expect(normalizeForInspection(null)).toBe('');
      expect(normalizeForInspection(undefined)).toBe('');
    });

    it('stringifies object payloads safely', () => {
      const obj = { username: "admin' OR 1=1--", action: 'query' };
      const normalized = normalizeForInspection(obj);
      expect(normalized).toContain("admin' OR 1=1--");
    });
  });
});
