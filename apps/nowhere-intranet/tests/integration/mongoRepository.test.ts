/**
 * VIGILANCE Nowhere Esports Intranet - MongoDB Repository Integration Tests
 * Runs against an isolated test database (vigilance_evidence_test).
 * Explicitly verifies MongoDB service availability before execution.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoEvidenceRepository } from '../../src/repository/mongoEvidenceRepository.js';
import { RawEvidenceRecord } from '../../src/models/types.js';

describe('MongoEvidenceRepository Integration Suite', () => {
  const testUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const testDbName = process.env.MONGO_DB_TEST_NAME || 'vigilance_evidence_test';

  let repo: MongoEvidenceRepository;
  let isMongoAvailable = false;

  beforeAll(async () => {
    repo = new MongoEvidenceRepository({
      uri: testUri,
      dbName: testDbName,
      serverSelectionTimeoutMS: 2000, // Fast 2s timeout for service check
    });

    try {
      await repo.connect();
      isMongoAvailable = true;
      console.log(`[INTEGRATION_TEST] Connected to live MongoDB for integration testing at ${testUri}/${testDbName}`);
    } catch {
      isMongoAvailable = false;
      console.warn(`[INTEGRATION_TEST_SKIPPED] MongoDB is not running at ${testUri}. Skipping integration tests.`);
      console.warn('To run integration tests: Start MongoDB on 127.0.0.1:27017 (e.g., docker run -d -p 127.0.0.1:27017:27017 mongo:7.0)');
    }
  });

  afterAll(async () => {
    if (isMongoAvailable) {
      try {
        // Drop test database to ensure zero state pollution
        if (mongoose.connection.db) {
          await mongoose.connection.db.dropDatabase();
        }
        await repo.close();
      } catch (err) {
        console.error('Error cleaning up test database:', err);
      }
    }
  });

  beforeEach(async () => {
    if (isMongoAvailable && mongoose.connection.db) {
      await mongoose.connection.db.collection('raw_evidence').deleteMany({});
    }
  });

  it('connects and persists an attack record with outbox PENDING status', async (ctx) => {
    if (!isMongoAvailable) {
      ctx.skip();
      return;
    }

    const sampleRecord: RawEvidenceRecord = {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: new Date(),
      publish_status: 'PENDING',
      published_at: null,
      retry_count: 0,
      request: {
        method: 'GET',
        url: "/api/v1/tournaments?region=' OR 1=1--",
        path: '/api/v1/tournaments',
        query: { region: "' OR 1=1--" },
        headers: { 'host': 'localhost:3000' },
        body_raw: null,
        payload_size_bytes: 0,
      },
      client: {
        remote_ip: '127.0.0.1',
        remote_port: 54321,
        user_agent: 'vitest-integration-client',
      },
      detection: {
        matched_signatures: [
          {
            rule_id: 'SIG-SQLI-001',
            rule_name: 'SQL Injection',
            category: 'SQL_INJECTION',
            severity_weight: 35,
            matched_location: 'query',
            extracted_sample: "' OR 1=1--",
          },
        ],
        severity_score: 35,
        severity_level: 'LOW',
        applied_modifiers: [],
      },
    };

    const mongoRawId = await repo.saveEvidence(sampleRecord);
    expect(mongoRawId).toBeDefined();
    expect(typeof mongoRawId).toBe('string');
    expect(mongoRawId.length).toBe(24); // Standard MongoDB ObjectId hex string length

    // Fetch by ID
    const fetched = await repo.getEvidenceById(mongoRawId);
    expect(fetched).not.toBeNull();
    expect(fetched?.event_id).toBe(sampleRecord.event_id);
    expect(fetched?.publish_status).toBe('PENDING');

    // Fetch by Event ID
    const byEvent = await repo.getEvidenceByEventId(sampleRecord.event_id);
    expect(byEvent).not.toBeNull();
    expect(byEvent?.id).toBe(mongoRawId);

    // Fetch Pending Outbox
    const pending = await repo.fetchPendingOutbox(10);
    expect(pending.length).toBe(1);
    expect(pending[0].event_id).toBe(sampleRecord.event_id);

    // Mark Published
    const publishedTime = new Date();
    await repo.markPublished(mongoRawId, publishedTime);

    const updated = await repo.getEvidenceById(mongoRawId);
    expect(updated?.publish_status).toBe('PUBLISHED');
    expect(updated?.published_at).toBeDefined();
  });

  it('fails fast and throws when connecting to an invalid MongoDB URI', async () => {
    const badRepo = new MongoEvidenceRepository({
      uri: 'mongodb://127.0.0.1:99999',
      dbName: 'bad_db',
      serverSelectionTimeoutMS: 500,
    });

    await expect(badRepo.connect()).rejects.toThrow(/\[MONGO_CONNECTION_FAILED\]/);
  });
});
