/**
 * VIGILANCE Outbox Publisher Unit Tests
 * Decoupled from MongoDB and Kafka using MockEvidenceRepository and MockKafkaProducer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutboxPublisher } from '../../src/kafka/outboxPublisher.js';
import { MockEvidenceRepository } from '../../src/repository/mockEvidenceRepository.js';
import { MockKafkaProducer } from '../../src/kafka/mockKafkaProducer.js';
import { RawEvidenceRecord } from '../../src/models/types.js';

describe('Reliable Outbox Publisher (Unit Tests)', () => {
  let mockRepo: MockEvidenceRepository;
  let mockProducer: MockKafkaProducer;
  let publisher: OutboxPublisher;

  function createTestRecord(eventId: string, ip = '198.51.100.1'): RawEvidenceRecord {
    return {
      event_id: eventId,
      timestamp: new Date(),
      publish_status: 'PENDING',
      retry_count: 0,
      client: {
        remote_ip: ip,
        remote_port: 44321,
        user_agent: 'curl/7.88.1',
      },
      request: {
        method: 'GET',
        url: '/tournaments',
        path: '/tournaments',
        query: { search: "' OR 1=1--" },
        headers: { host: 'localhost:3000' },
        body_raw: null,
        payload_size_bytes: 0,
      },
      detection: {
        severity_score: 35,
        severity_level: 'LOW',
        applied_modifiers: [],
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
      },
    };
  }

  beforeEach(async () => {
    mockRepo = new MockEvidenceRepository();
    mockProducer = new MockKafkaProducer();
    await mockProducer.connect();

    publisher = new OutboxPublisher(mockRepo, mockProducer, {
      topic: 'raw-attacks',
      batchSize: 10,
      claimTimeoutMs: 1000, // 1 second for fast test execution
      maxRetries: 3,
      baseBackoffMs: 0,
      maxBackoffMs: 1000,
      workerId: 'test-worker-1',
    });
  });

  it('claims pending records, publishes to Kafka raw-attacks, and marks PUBLISHED', async () => {
    const rawId = await mockRepo.saveEvidence(createTestRecord('a8098c1a-f86e-11da-bd1a-00112444be1e', '203.0.113.10'));

    const batchResult = await publisher.processBatch();

    expect(batchResult.claimed).toBe(1);
    expect(batchResult.published).toBe(1);
    expect(batchResult.failed).toBe(0);

    // Verify Kafka message received
    const messages = mockProducer.getPublishedMessages('raw-attacks');
    expect(messages.length).toBe(1);
    expect(messages[0].key).toBe('203.0.113.10'); // Keyed by source IP
    expect(messages[0].headers?.['x-event-id']).toBe('a8098c1a-f86e-11da-bd1a-00112444be1e');

    // Verify MongoDB status updated to PUBLISHED
    const updated = await mockRepo.getEvidenceById(rawId);
    expect(updated?.publish_status).toBe('PUBLISHED');
    expect(updated?.published_at).toBeInstanceOf(Date);
  });

  it('handles Kafka broker outage: increments retry count and releases claim back to PENDING', async () => {
    const rawId = await mockRepo.saveEvidence(createTestRecord('a8098c1a-f86e-11da-bd1a-00112444be1e'));

    // Simulate broker unavailable
    mockProducer.setPersistentFailure(true, new Error('Broker disconnected: Connection refused'));

    const batchResult = await publisher.processBatch();

    expect(batchResult.claimed).toBe(1);
    expect(batchResult.published).toBe(0);
    expect(batchResult.failed).toBe(1);

    const record = await mockRepo.getEvidenceById(rawId);
    expect(record?.publish_status).toBe('PENDING'); // Released back to pending
    expect(record?.retry_count).toBe(1);
    expect(record?.last_error).toContain('Broker disconnected');
  });

  it('marks record as FAILED when retries are exhausted (maxRetries=3)', async () => {
    const rawId = await mockRepo.saveEvidence(createTestRecord('a8098c1a-f86e-11da-bd1a-00112444be1e'));
    mockProducer.setPersistentFailure(true);

    // Run 3 attempts
    await publisher.processBatch();
    await publisher.processBatch();
    await publisher.processBatch();

    const record = await mockRepo.getEvidenceById(rawId);
    expect(record?.retry_count).toBe(3);
    expect(record?.publish_status).toBe('FAILED');
  });

  it('recovers abandoned claims after worker crash and claim timeout expires', async () => {
    const rawId = await mockRepo.saveEvidence(createTestRecord('a8098c1a-f86e-11da-bd1a-00112444be1e'));

    // Worker 1 claims the record, then "crashes" (leaving it CLAIMED with an expired timestamp)
    const record = await mockRepo.getEvidenceById(rawId);
    record!.publish_status = 'CLAIMED';
    record!.claimed_at = new Date(Date.now() - 5000); // 5 seconds ago (timeout is 1s)
    record!.claimed_by = 'crashed-worker-99';

    // Worker 2 runs processBatch
    const batchResult = await publisher.processBatch();

    expect(batchResult.claimed).toBe(1);
    expect(batchResult.published).toBe(1);

    const recovered = await mockRepo.getEvidenceById(rawId);
    expect(recovered?.publish_status).toBe('PUBLISHED');
  });

  it('prevents concurrent workers from double-publishing the same record', async () => {
    // Save 5 pending records
    for (let i = 0; i < 5; i++) {
      await mockRepo.saveEvidence(createTestRecord(`a8098c1a-f86e-11da-bd1a-00112444be1${i}`));
    }

    const workerA = new OutboxPublisher(mockRepo, mockProducer, { batchSize: 3, workerId: 'worker-A', baseBackoffMs: 0 });
    const workerB = new OutboxPublisher(mockRepo, mockProducer, { batchSize: 5, workerId: 'worker-B', baseBackoffMs: 0 });

    // Both workers claim concurrently
    const [resA, resB] = await Promise.all([
      workerA.processBatch(),
      workerB.processBatch(),
    ]);

    expect(resA.published + resB.published).toBe(5);
    expect(mockProducer.getAllPublishedMessages().length).toBe(5);

    // Verify all 5 records are published and no duplicate messages exist
    const publishedIds = mockProducer.getAllPublishedMessages().map((m) => m.headers?.['x-event-id']);
    const uniqueIds = new Set(publishedIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('sanitizes sensitive database credentials from logged error messages', async () => {
    const rawId = await mockRepo.saveEvidence(createTestRecord('a8098c1a-f86e-11da-bd1a-00112444be1e'));

    // Inject an error message containing a raw connection URI with credentials
    mockProducer.setPersistentFailure(
      true,
      new Error('Failed to connect to mongodb://admin:SuperSecretPass123@mongo.internal:27017/evidence')
    );

    await publisher.processBatch();

    const record = await mockRepo.getEvidenceById(rawId);
    expect(record?.last_error).not.toContain('SuperSecretPass123');
    expect(record?.last_error).toContain('[REDACTED_CREDENTIALS]');
  });
});
