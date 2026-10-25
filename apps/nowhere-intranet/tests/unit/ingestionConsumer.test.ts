/**
 * VIGILANCE Ingestion Demonstration Consumer Unit Tests
 * Decoupled from Kafka using MockKafkaConsumer and MockKafkaProducer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IngestionDemonstrationConsumer } from '../../src/kafka/ingestionConsumer.js';
import { MockKafkaConsumer } from '../../src/kafka/mockKafkaConsumer.js';
import { MockKafkaProducer } from '../../src/kafka/mockKafkaProducer.js';
import { RawAttackEvent } from '../../src/events/eventContract.js';

describe('Ingestion Demonstration Consumer (Unit Tests)', () => {
  let mockConsumer: MockKafkaConsumer;
  let mockDlqProducer: MockKafkaProducer;
  let consumer: IngestionDemonstrationConsumer;

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

  beforeEach(async () => {
    mockConsumer = new MockKafkaConsumer();
    mockDlqProducer = new MockKafkaProducer();
    await mockConsumer.connect();
    await mockDlqProducer.connect();

    consumer = new IngestionDemonstrationConsumer(mockConsumer, mockDlqProducer, {
      sourceTopic: 'raw-attacks',
      dlqTopic: 'raw-attacks-dlq',
    });

    await consumer.start();
  });

  it('processes a valid RawAttackEvent and commits the partition offset', async () => {
    await mockConsumer.simulateMessageArrival({
      topic: 'raw-attacks',
      partition: 1,
      offset: '42',
      key: '198.51.100.42',
      value: JSON.stringify(validEvent),
    });

    const stats = consumer.getStats();
    expect(stats.totalProcessed).toBe(1);
    expect(stats.validEvents).toBe(1);
    expect(stats.duplicateEvents).toBe(0);
    expect(stats.dlqEvents).toBe(0);

    // Offset committed for raw-attacks partition 1
    expect(mockConsumer.getCommittedOffset('raw-attacks', 1)).toBe('42');
  });

  it('detects duplicate event_ids, suppresses duplicate execution, and commits offset', async () => {
    const msg = {
      topic: 'raw-attacks',
      partition: 1,
      offset: '100',
      key: '198.51.100.42',
      value: JSON.stringify(validEvent),
    };

    // First arrival
    await mockConsumer.simulateMessageArrival(msg);

    // Second arrival (duplicate delivery caused by outbox retry)
    await mockConsumer.simulateMessageArrival({
      ...msg,
      offset: '101',
    });

    const stats = consumer.getStats();
    expect(stats.totalProcessed).toBe(2);
    expect(stats.validEvents).toBe(1);
    expect(stats.duplicateEvents).toBe(1);
    expect(mockConsumer.getCommittedOffset('raw-attacks', 1)).toBe('101');
  });

  it('routes corrupt non-JSON payloads to raw-attacks-dlq and commits offset', async () => {
    await mockConsumer.simulateMessageArrival({
      topic: 'raw-attacks',
      partition: 2,
      offset: '200',
      key: '10.0.0.1',
      value: 'NOT_VALID_JSON{:::broken',
    });

    const stats = consumer.getStats();
    expect(stats.validEvents).toBe(0);
    expect(stats.dlqEvents).toBe(1);

    // Verify DLQ message
    const dlqMessages = mockDlqProducer.getPublishedMessages('raw-attacks-dlq');
    expect(dlqMessages.length).toBe(1);
    expect(dlqMessages[0].headers?.['x-dlq-reason']).toBe('CORRUPT_JSON_SYNTAX');
    expect(dlqMessages[0].headers?.['x-original-topic']).toBe('raw-attacks');
    expect(dlqMessages[0].headers?.['x-original-partition']).toBe('2');

    // Offset must be committed so poison pill is not stuck in infinite replay
    expect(mockConsumer.getCommittedOffset('raw-attacks', 2)).toBe('200');
  });

  it('routes schema contract violations to raw-attacks-dlq and commits offset', async () => {
    const invalidEvent = {
      ...validEvent,
      event_id: 'bad-id', // Invalid UUID
      detection: {
        severity_score: 999, // Invalid score
      },
    };

    await mockConsumer.simulateMessageArrival({
      topic: 'raw-attacks',
      partition: 0,
      offset: '300',
      key: '198.51.100.42',
      value: JSON.stringify(invalidEvent),
    });

    const stats = consumer.getStats();
    expect(stats.dlqEvents).toBe(1);
    expect(stats.validEvents).toBe(0);

    const dlqMessages = mockDlqProducer.getPublishedMessages('raw-attacks-dlq');
    expect(dlqMessages.length).toBe(1);
    expect(dlqMessages[0].headers?.['x-dlq-reason']).toContain('SCHEMA_VALIDATION_FAILURE');
    expect(mockConsumer.getCommittedOffset('raw-attacks', 0)).toBe('300');
  });
});
