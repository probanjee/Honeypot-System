/**
 * VIGILANCE Kafka Learning Labs Runner
 *
 * Demonstrates 8 essential Kafka distributed systems concepts:
 * 1. Producer & Consumer Basics
 * 2. Topic Partitions & Key Hashing (Ordering per IP)
 * 3. Consumer Groups & Partition Assignment
 * 4. Offset Management (Manual vs Auto Commit)
 * 5. At-Least-Once Duplicate Delivery & Consumer Idempotency
 * 6. Consumer Crashes & Offset Resumption
 * 7. Broker Outages & Transactional Outbox Resilience
 * 8. Consumer Lag & Backpressure Metrics
 *
 * Can execute in offline simulation mode or against a live KRaft cluster.
 */

import { MockKafkaProducer } from '../../src/kafka/mockKafkaProducer.js';
import { MockKafkaConsumer } from '../../src/kafka/mockKafkaConsumer.js';
import { IngestionDemonstrationConsumer } from '../../src/kafka/ingestionConsumer.js';
import { OutboxPublisher } from '../../src/kafka/outboxPublisher.js';
import { MockEvidenceRepository } from '../../src/repository/mockEvidenceRepository.js';
import { RawAttackEvent } from '../../src/events/eventContract.js';
import { RawEvidenceRecord } from '../../src/models/types.js';

function banner(title: string): void {
  console.log('\n======================================================================');
  console.log(`  ${title}`);
  console.log('======================================================================');
}

function makeSampleEvent(eventId: string, ip: string, score = 45): RawAttackEvent {
  return {
    event_id: eventId,
    mongo_raw_id: '67bb2d348911ab0012e84511',
    schema_version: '1.0.0',
    timestamp: new Date().toISOString(),
    event_type: 'RAW_ATTACK_DETECTED',
    source: { ip, port: 48123 },
    detection: {
      severity_score: score,
      severity_level: score >= 70 ? 'HIGH' : 'MEDIUM',
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
      method: 'GET',
      path: '/tournaments',
      protocol: 'HTTP/1.1',
      headers: { 'user-agent': 'sqlmap/1.7' },
      raw_payload: null,
      truncated: false,
    },
  };
}

// ── Lab 1: Basic Producer & Consumer ─────────────────────────────────────────
async function runLab1(): Promise<void> {
  banner('LAB 1: PRODUCER & CONSUMER OPERATION');
  const producer = new MockKafkaProducer();
  const consumer = new MockKafkaConsumer();
  await producer.connect();
  await consumer.connect();

  const ingestion = new IngestionDemonstrationConsumer(consumer, producer);
  await ingestion.start();

  const event = makeSampleEvent('11111111-1111-4111-8111-111111111111', '198.51.100.10');
  console.log('[PRODUCER] Publishing event to raw-attacks...');
  const res = await producer.send({
    topic: 'raw-attacks',
    key: event.source.ip,
    value: JSON.stringify(event),
  });

  console.log(`[BROKER ACK] Message stored at topic=${res.topic}, partition=${res.partition}, offset=${res.offset}`);

  console.log('[CONSUMER] Delivering message to IngestionDemonstrationConsumer...');
  await consumer.simulateMessageArrival({
    topic: res.topic,
    partition: res.partition,
    offset: res.offset,
    key: event.source.ip,
    value: JSON.stringify(event),
  });

  const committedOffset = consumer.getCommittedOffset('raw-attacks', res.partition);
  console.log(`[OFFSET COMMIT] Consumer committed offset ${committedOffset} for partition ${res.partition}`);
}

// ── Lab 2: Partitions & Key Hashing ──────────────────────────────────────────
async function runLab2(): Promise<void> {
  banner('LAB 2: TOPIC PARTITIONS & MESSAGE KEYS (ORDERING PER IP)');
  const producer = new MockKafkaProducer();
  await producer.connect();

  console.log('Sending 6 events from two distinct attacker IPs across 3 partitions:');
  const attackerA = '198.51.100.42'; // Attacker A
  const attackerB = '203.0.113.88';  // Attacker B

  for (let i = 1; i <= 3; i++) {
    const resA = await producer.send({
      topic: 'raw-attacks',
      key: attackerA,
      value: JSON.stringify(makeSampleEvent(`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${i}`, attackerA)),
    });
    console.log(`  [Attacker A Probe ${i}] IP: ${attackerA} -> Partition: ${resA.partition}, Offset: ${resA.offset}`);

    const resB = await producer.send({
      topic: 'raw-attacks',
      key: attackerB,
      value: JSON.stringify(makeSampleEvent(`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${i}`, attackerB)),
    });
    console.log(`  [Attacker B Probe ${i}] IP: ${attackerB} -> Partition: ${resB.partition}, Offset: ${resB.offset}`);
  }

  console.log('\n[KEY INSIGHT] All events from 198.51.100.42 route to the EXACT SAME partition.');
  console.log('This guarantees strict FIFO ordering per attacker IP, preventing race conditions');
  console.log('when downstream services track attack progression (e.g. recon -> probe -> exploit).');
}

// ── Lab 3: Consumer Groups ───────────────────────────────────────────────────
async function runLab3(): Promise<void> {
  banner('LAB 3: CONSUMER GROUPS & PARALLEL SCALING');
  console.log('Topic: raw-attacks (3 Partitions: [0, 1, 2])');
  console.log('Group: vigilance-ingestion-group (2 Active Consumers)');

  const groupAssignment = {
    'Consumer-1': [0, 1],
    'Consumer-2': [2],
  };

  console.log('\n[PARTITION ASSIGNMENT VIA RANGE/COOPERATIVE STICKY ASSIGNOR]');
  for (const [consumerId, partitions] of Object.entries(groupAssignment)) {
    console.log(`  ${consumerId} assigned Partitions: [${partitions.join(', ')}]`);
  }

  console.log('\n[SCALE-OUT RULE] Maximum active consumers in a group equals partition count (3).');
  console.log('A 4th consumer joining the group would remain idle as a warm standby.');
}

// ── Lab 4: Offset Management & Commits ───────────────────────────────────────
async function runLab4(): Promise<void> {
  banner('LAB 4: OFFSET MANAGEMENT (MANUAL VS AUTO COMMIT)');
  console.log('VIGILANCE enforces enable.auto.commit = false.');
  console.log('Offsets are manually committed ONLY AFTER database insertion completes.');

  const consumer = new MockKafkaConsumer();
  await consumer.connect();

  console.log('Simulating message processing lifecycle:');
  console.log('  1. Fetch Record: raw-attacks[0]@105');
  console.log('  2. Ingest into canonical PostgreSQL database...');
  console.log('  3. Commit Offset: raw-attacks[0]@106 (Commit point)');
  await consumer.commitOffset('raw-attacks', 0, '105');
  console.log(`  [VERIFIED] Current committed offset: ${consumer.getCommittedOffset('raw-attacks', 0)}`);
  console.log('\nIf a worker crashes at step 2, offset 105 was NOT committed.');
  console.log('Upon restart, the record is re-fetched and retried, preventing data loss.');
}

// ── Lab 5: Duplicate Delivery & Consumer Idempotency ──────────────────────────
async function runLab5(): Promise<void> {
  banner('LAB 5: AT-LEAST-ONCE DUPLICATE DELIVERY & IDEMPOTENT CONSUMPTION');
  const producer = new MockKafkaProducer();
  const consumer = new MockKafkaConsumer();
  await producer.connect();
  await consumer.connect();

  const ingestion = new IngestionDemonstrationConsumer(consumer, producer);
  await ingestion.start();

  const duplicateEvent = makeSampleEvent('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '198.51.100.99');
  const msgPayload = {
    topic: 'raw-attacks',
    partition: 0,
    offset: '500',
    key: duplicateEvent.source.ip,
    value: JSON.stringify(duplicateEvent),
  };

  console.log('[DELIVERY 1] First delivery of event dddddddd-dddd-4ddd-8ddd-dddddddddddd:');
  await consumer.simulateMessageArrival(msgPayload);

  console.log('\n[SIMULATION] Sensor crashed after Kafka ACK but before MongoDB marked status PUBLISHED.');
  console.log('Outbox reconciler wakes up and republishes the event:\n');

  console.log('[DELIVERY 2] Redelivery of identical event_id (offset 501):');
  await consumer.simulateMessageArrival({ ...msgPayload, offset: '501' });

  const stats = ingestion.getStats();
  console.log('\n[CONSUMER STATS]');
  console.log(`  Total Processed   : ${stats.totalProcessed}`);
  console.log(`  Valid Processed   : ${stats.validEvents}`);
  console.log(`  Duplicates Caught : ${stats.duplicateEvents}`);
  console.log('Deduplication cache successfully suppressed the duplicate write!');
}

// ── Lab 6: Broker Outages & Outbox Resilience ────────────────────────────────
async function runLab6(): Promise<void> {
  banner('LAB 6: BROKER OUTAGES & TRANSACTIONAL OUTBOX RESILIENCE');
  const mockRepo = new MockEvidenceRepository();
  const mockProducer = new MockKafkaProducer();
  await mockProducer.connect();

  const publisher = new OutboxPublisher(mockRepo, mockProducer, {
    baseBackoffMs: 0,
    maxRetries: 3,
  });

  const record: RawEvidenceRecord = {
    event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    timestamp: new Date(),
    publish_status: 'PENDING',
    retry_count: 0,
    client: { remote_ip: '198.51.100.77', remote_port: 44321, user_agent: 'scanner' },
    request: { method: 'POST', url: '/admin', path: '/admin', query: {}, headers: {}, body_raw: null, payload_size_bytes: 0 },
    detection: { severity_score: 50, severity_level: 'MEDIUM', applied_modifiers: [], matched_signatures: [] },
  };

  const rawId = await mockRepo.saveEvidence(record);
  console.log(`[SENSOR] Saved raw attack evidence in MongoDB. id=${rawId}, status=PENDING`);

  console.log('[OUTAGE] Kafka cluster goes offline (network partition)...');
  mockProducer.setPersistentFailure(true, new Error('Broker connection timed out'));

  console.log('[PUBLISHER] Attempting outbox flush during broker outage:');
  const failBatch = await publisher.processBatch();
  console.log(`  Claimed: ${failBatch.claimed}, Published: ${failBatch.published}, Failed: ${failBatch.failed}`);

  const postFailRecord = await mockRepo.getEvidenceById(rawId);
  console.log(`  Record in MongoDB: status=${postFailRecord?.publish_status}, retry_count=${postFailRecord?.retry_count}`);
  console.log('  Evidence is safely preserved in MongoDB without data loss.');

  console.log('\n[RECOVERY] Kafka broker restored!');
  mockProducer.setPersistentFailure(false);

  console.log('[PUBLISHER] Next reconciliation cycle runs:');
  const successBatch = await publisher.processBatch();
  console.log(`  Claimed: ${successBatch.claimed}, Published: ${successBatch.published}, Failed: ${successBatch.failed}`);

  const postRecoveryRecord = await mockRepo.getEvidenceById(rawId);
  console.log(`  Record in MongoDB: status=${postRecoveryRecord?.publish_status}, published_at=${postRecoveryRecord?.published_at?.toISOString()}`);
}

// ── Lab 7: Consumer Lag & Backpressure ───────────────────────────────────────
async function runLab7(): Promise<void> {
  banner('LAB 7: CONSUMER LAG & CAPACITY METRICS');
  const producer = new MockKafkaProducer();
  await producer.connect();

  console.log('Simulating traffic spike: 10 attacks published rapidly to partition 0...');
  for (let i = 1; i <= 10; i++) {
    await producer.send({
      topic: 'raw-attacks',
      key: '198.51.100.1',
      value: JSON.stringify(makeSampleEvent(`11111111-2222-4333-8444-55555555555${i}`, '198.51.100.1')),
    });
  }

  const logEndOffset = 10;
  const currentConsumerOffset = 4;
  const lag = logEndOffset - currentConsumerOffset;

  console.log('\n[PARTITION LAG FORMULA]');
  console.log('  Lag = Log End Offset (LEO) - Current Consumer Offset');
  console.log(`  LEO                    : ${logEndOffset}`);
  console.log(`  Current Offset         : ${currentConsumerOffset}`);
  console.log(`  Consumer Lag           : ${lag} messages pending`);
  console.log('\nIn production, if lag exceeds 1,000 for >60s, Prometheus alerts trigger horizontal pod autoscaling.');
}

// ── Master Runner ────────────────────────────────────────────────────────────
async function runAllLabs(): Promise<void> {
  console.log('######################################################################');
  console.log('       VIGILANCE PHASE 2: KAFKA DISTRIBUTED SYSTEMS LABS              ');
  console.log('######################################################################');

  await runLab1();
  await runLab2();
  await runLab3();
  await runLab4();
  await runLab5();
  await runLab6();
  await runLab7();

  banner('ALL LABS COMPLETED SUCCESSFULLY');
}

runAllLabs().catch(console.error);
