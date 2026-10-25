/**
 * VIGILANCE Kafka Integration Tests
 * Runs against live Apache Kafka (KRaft mode) when available.
 *
 * CRITICAL DISCIPLINE:
 * Never claims tests passed if services are offline.
 * Detects broker availability before test execution and skips gracefully if unavailable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'node:net';
import { KafkaProducer } from '../../src/kafka/kafkaProducer.js';
import { KafkaConsumer } from '../../src/kafka/kafkaConsumer.js';
import { RawAttackEvent } from '../../src/events/eventContract.js';

describe('Kafka KRaft Live Integration Suite', () => {
  const KAFKA_HOST = process.env.KAFKA_HOST || '127.0.0.1';
  const KAFKA_PORT = parseInt(process.env.KAFKA_PORT || '9092', 10);
  let kafkaAvailable = false;
  let producer: KafkaProducer | null = null;
  let consumer: KafkaConsumer | null = null;

  beforeAll(async () => {
    // Probe TCP connectivity to Kafka broker
    kafkaAvailable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(KAFKA_PORT, KAFKA_HOST);
    });

    if (!kafkaAvailable) {
      console.warn(
        `\n[INTEGRATION_TEST_SKIPPED] Apache Kafka is not running at ${KAFKA_HOST}:${KAFKA_PORT}. Skipping live Kafka integration tests.\n` +
        `To run integration tests: Start the KRaft cluster via 'docker compose up -d kafka kafka-init-topics'\n`
      );
    }
  });

  afterAll(async () => {
    if (producer) {
      await producer.disconnect();
    }
    if (consumer) {
      await consumer.disconnect();
    }
  });

  it('checks Kafka broker connectivity without throwing unhandled exceptions', () => {
    expect(typeof kafkaAvailable).toBe('boolean');
  });

  it('publishes and consumes a versioned RawAttackEvent on live KRaft cluster', async (ctx) => {
    if (!kafkaAvailable) {
      ctx.skip();
      return;
    }

    const testEventId = 'a8098c1a-f86e-11da-bd1a-00112444be1e';
    const testTopic = 'raw-attacks';
    const testGroupId = `test-integration-group-${Date.now()}`;

    producer = new KafkaProducer({
      brokers: [`${KAFKA_HOST}:${KAFKA_PORT}`],
      clientId: 'integration-test-producer',
    });
    await producer.connect();

    consumer = new KafkaConsumer({
      brokers: [`${KAFKA_HOST}:${KAFKA_PORT}`],
      groupId: testGroupId,
      fromBeginning: true,
    });
    await consumer.connect();
    await consumer.subscribe([testTopic]);

    const testEvent: RawAttackEvent = {
      event_id: testEventId,
      mongo_raw_id: '67bb2d348911ab0012e84511',
      schema_version: '1.0.0',
      timestamp: new Date().toISOString(),
      event_type: 'RAW_ATTACK_DETECTED',
      source: {
        ip: '198.51.100.99',
        port: 50123,
      },
      detection: {
        severity_score: 50,
        severity_level: 'MEDIUM',
        matched_rules: [
          {
            rule_id: 'SIG-SQLI-001',
            rule_name: 'SQL Injection',
            category: 'SQL_INJECTION',
            weight: 35,
          },
        ],
      },
      request: {
        method: 'POST',
        path: '/admin/login',
        protocol: 'HTTP/1.1',
        headers: { host: 'localhost:3000' },
        raw_payload: 'user=admin&pass=test',
        truncated: false,
      },
    };

    let receivedEvent: RawAttackEvent | null = null;
    const messagePromise = new Promise<void>((resolve) => {
      consumer!.run(async (msg) => {
        try {
          const parsed = JSON.parse(msg.value);
          if (parsed.event_id === testEventId) {
            receivedEvent = parsed;
            resolve();
          }
        } catch {
          // Ignore unrelated test messages
        }
      });
    });

    // Send to live topic
    const pubResult = await producer.send({
      topic: testTopic,
      key: testEvent.source.ip,
      value: JSON.stringify(testEvent),
    });

    expect(pubResult.topic).toBe(testTopic);
    expect(pubResult.partition).toBeGreaterThanOrEqual(0);

    // Wait up to 10s for message consumption
    await Promise.race([
      messagePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Live consumption timed out after 10s')), 10000)),
    ]);

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent!.event_id).toBe(testEventId);
  });
});
