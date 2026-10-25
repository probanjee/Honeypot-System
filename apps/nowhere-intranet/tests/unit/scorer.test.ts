/**
 * VIGILANCE Nowhere Esports Intranet - Severity Scorer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { SeverityScorer } from '../../src/engine/scorer.js';
import { MatchedSignature } from '../../src/models/types.js';

describe('Severity Scorer Engine', () => {
  const scorer = new SeverityScorer();

  it('assigns score of 0 and INFORMATIONAL level for benign requests', () => {
    const res = scorer.calculate([], { path: '/tournaments' });
    expect(res.clamped_score).toBe(0);
    expect(res.severity_level).toBe('INFORMATIONAL');
    expect(res.applied_modifiers.length).toBe(0);
  });

  it('calculates score accurately for a single SQLi rule (weight 35)', () => {
    const matches: MatchedSignature[] = [
      {
        rule_id: 'SIG-SQLI-001',
        rule_name: 'Classic SQL Injection',
        category: 'SQL_INJECTION',
        severity_weight: 35,
        matched_location: 'query',
        extracted_sample: "' OR 1=1--",
      },
    ];

    const res = scorer.calculate(matches, { path: '/api/v1/tournaments' });
    expect(res.base_score).toBe(35);
    expect(res.context_modifier).toBe(0);
    expect(res.clamped_score).toBe(35);
    expect(res.severity_level).toBe('LOW');
  });

  it('applies canary path modifier (+15) when attacking sensitive decoys', () => {
    const matches: MatchedSignature[] = [
      {
        rule_id: 'SIG-DISC-001',
        rule_name: 'Canary Probe',
        category: 'RECONNAISSANCE',
        severity_weight: 35,
        matched_location: 'path',
        extracted_sample: '/.env',
      },
    ];

    const res = scorer.calculate(matches, { path: '/.env' });
    expect(res.base_score).toBe(35);
    expect(res.context_modifier).toBe(15);
    expect(res.clamped_score).toBe(50);
    expect(res.severity_level).toBe('MEDIUM');
    expect(res.applied_modifiers).toContain('CANARY_ROUTE_PROBE (+15)');
  });

  it('applies scanner user-agent modifier (+15)', () => {
    const matches: MatchedSignature[] = [
      {
        rule_id: 'SIG-SCAN-001',
        rule_name: 'Vulnerability Scanner',
        category: 'SCANNER',
        severity_weight: 25,
        matched_location: 'headers.user-agent',
        extracted_sample: 'sqlmap/1.7',
      },
    ];

    const res = scorer.calculate(matches, {
      path: '/tournaments',
      userAgent: 'sqlmap/1.7.2#stable',
    });

    expect(res.base_score).toBe(25);
    expect(res.context_modifier).toBe(15);
    expect(res.clamped_score).toBe(40);
    expect(res.severity_level).toBe('MEDIUM');
    expect(res.applied_modifiers).toContain('SCANNER_USER_AGENT (+15)');
  });

  it('applies multi-vector bonus (+20) when blending multiple distinct categories', () => {
    const matches: MatchedSignature[] = [
      {
        rule_id: 'SIG-SQLI-001',
        rule_name: 'SQLi',
        category: 'SQL_INJECTION',
        severity_weight: 35,
        matched_location: 'query',
        extracted_sample: '1=1',
      },
      {
        rule_id: 'SIG-TRAV-001',
        rule_name: 'Path Traversal',
        category: 'PATH_TRAVERSAL',
        severity_weight: 40,
        matched_location: 'path',
        extracted_sample: '../../etc',
      },
    ];

    const res = scorer.calculate(matches, { path: '/download' });
    expect(res.base_score).toBe(75);
    expect(res.context_modifier).toBe(20);
    expect(res.clamped_score).toBe(95);
    expect(res.severity_level).toBe('CRITICAL');
    expect(res.applied_modifiers).toContain('MULTI_VECTOR_COMBINATION (+20)');
  });

  it('clamps scores strictly to 100 when raw score exceeds threshold', () => {
    const matches: MatchedSignature[] = [
      {
        rule_id: 'SIG-LOG4J-001',
        rule_name: 'Log4Shell',
        category: 'LOG4SHELL',
        severity_weight: 50,
        matched_location: 'headers.user-agent',
        extracted_sample: '${jndi:ldap...}',
      },
      {
        rule_id: 'SIG-CMDI-001',
        rule_name: 'Command Injection',
        category: 'COMMAND_INJECTION',
        severity_weight: 45,
        matched_location: 'body',
        extracted_sample: '; /bin/bash',
      },
    ];

    // 50 + 45 = 95 base + 15 (canary path) + 15 (scanner) + 20 (multi-vector) = 145 raw!
    const res = scorer.calculate(matches, {
      path: '/admin/config',
      userAgent: 'nikto/2.1.6',
    });

    expect(res.raw_score).toBe(145);
    expect(res.clamped_score).toBe(100);
    expect(res.severity_level).toBe('CRITICAL');
  });
});
