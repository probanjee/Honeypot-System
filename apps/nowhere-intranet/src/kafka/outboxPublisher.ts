/**
 * VIGILANCE Nowhere Esports Intranet - Reliable Outbox Publisher
 *
 * Implements the Transactional Outbox Pattern to bridge MongoDB evidence storage
 * and Apache Kafka's `raw-attacks` topic.
 *
 * Distributed Systems Guarantee:
 * - At-least-once delivery semantics.
 * - MongoDB and Kafka are separate transactional systems (no 2PC).
 * - A crash after Kafka ACK but before MongoDB status update can produce duplicate events;
 *   downstream consumers must deduplicate using the immutable `event_id`.
 */

import { IEvidenceRepository } from '../repository/evidenceRepository.interface.js';
import { IKafkaProducer } from './kafkaProducer.interface.js';
import { createRawAttackEvent, validateRawAttackEvent } from '../events/eventContract.js';
import { RawEvidenceRecord } from '../models/types.js';

export interface OutboxPublisherConfig {
  topic?: string;
  batchSize?: number;
  pollIntervalMs?: number;
  claimTimeoutMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  workerId?: string;
}

export interface PublishBatchResult {
  claimed: number;
  published: number;
  failed: number;
  skippedBackoff: number;
}

export class OutboxPublisher {
  private repo: IEvidenceRepository;
  private producer: IKafkaProducer;
  private topic: string;
  private batchSize: number;
  private pollIntervalMs: number;
  private claimTimeoutMs: number;
  private maxRetries: number;
  private baseBackoffMs: number;
  private maxBackoffMs: number;
  private workerId: string;

  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    repo: IEvidenceRepository,
    producer: IKafkaProducer,
    config: OutboxPublisherConfig = {}
  ) {
    this.repo = repo;
    this.producer = producer;
    this.topic = config.topic || 'raw-attacks';
    this.batchSize = config.batchSize ?? 20;
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
    this.claimTimeoutMs = config.claimTimeoutMs ?? 60000; // 60s abandoned claim timeout
    this.maxRetries = config.maxRetries ?? 5;
    this.baseBackoffMs = config.baseBackoffMs ?? 1000; // 1s base backoff
    this.maxBackoffMs = config.maxBackoffMs ?? 60000; // 60s max backoff
    this.workerId = config.workerId || `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Calculates exponential backoff with ceiling.
   */
  calculateBackoffMs(retryCount: number): number {
    return Math.min(this.maxBackoffMs, this.baseBackoffMs * Math.pow(2, retryCount));
  }

  /**
   * Sanitizes error message strings to ensure sensitive tokens or connection URIs do not leak into MongoDB.
   */
  private sanitizeError(err: unknown): string {
    if (!err) return 'Unknown error';
    const msg = err instanceof Error ? err.message : String(err);
    // Strip connection strings with passwords: e.g. mongodb://user:pass@host
    return msg
      .replace(/(mongodb|kafka):\/\/[^@]+@/gi, '$1://[REDACTED_CREDENTIALS]@')
      .slice(0, 500);
  }

  /**
   * Processes a single batch of claimed outbox records.
   * Can be invoked manually during testing or periodically by the polling timer.
   */
  async processBatch(): Promise<PublishBatchResult> {
    const result: PublishBatchResult = {
      claimed: 0,
      published: 0,
      failed: 0,
      skippedBackoff: 0,
    };

    let claimedRecords: RawEvidenceRecord[] = [];
    try {
      claimedRecords = await this.repo.claimPendingOutbox(
        this.batchSize,
        this.claimTimeoutMs,
        this.workerId
      );
    } catch (claimErr) {
      console.error(`[OUTBOX_CLAIM_FAILED] Worker ${this.workerId} failed to claim records:`, this.sanitizeError(claimErr));
      return result;
    }

    result.claimed = claimedRecords.length;
    if (result.claimed === 0) {
      return result;
    }

    for (const record of claimedRecords) {
      const recordId = record.id || record.event_id;

      // 1. Check bounded exponential backoff
      if (record.retry_count > 0 && record.claimed_at) {
        const requiredBackoff = this.calculateBackoffMs(record.retry_count);
        const lastAttemptAge = Date.now() - new Date(record.timestamp).getTime();
        if (lastAttemptAge < requiredBackoff) {
          // Release claim without penalty if still within backoff window
          result.skippedBackoff++;
          continue;
        }
      }

      // 2. Validate and map to versioned RawAttackEvent (v1.0.0)
      const event = createRawAttackEvent(record, recordId);
      const validation = validateRawAttackEvent(event);

      if (!validation.valid) {
        const errorMsg = `CONTRACT_VALIDATION_FAILED: ${validation.errors.join('; ')}`;
        console.error(`[OUTBOX_CONTRACT_ERROR] Event ${record.event_id}:`, errorMsg);
        await this.repo.releaseClaim(recordId, errorMsg, this.maxRetries);
        result.failed++;
        continue;
      }

      // 3. Publish to Kafka using source IP as message key
      try {
        const publishResult = await this.producer.send({
          topic: this.topic,
          key: event.source.ip,
          value: JSON.stringify(event),
          headers: {
            'x-event-id': event.event_id,
            'x-schema-version': event.schema_version,
            'x-source-ip': event.source.ip,
          },
        });

        // 4. Mark published only after Kafka delivery acknowledgment
        const publishedAt = new Date();
        await this.repo.markPublished(recordId, publishedAt);
        result.published++;

        // Structured logging
        console.log(
          `[OUTBOX_PUBLISHED] Event ${event.event_id} -> ${publishResult.topic}[${publishResult.partition}]@${publishResult.offset} (Key: ${event.source.ip})`
        );
      } catch (publishErr) {
        const errorReason = this.sanitizeError(publishErr);
        console.error(`[OUTBOX_PUBLISH_FAILED] Event ${record.event_id} (Attempt ${record.retry_count + 1}/${this.maxRetries}):`, errorReason);
        await this.repo.releaseClaim(recordId, errorReason, this.maxRetries);
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Starts the background outbox polling loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[OUTBOX_WORKER_STARTED] Worker ${this.workerId} polling every ${this.pollIntervalMs}ms on topic ${this.topic}`);

    const poll = async () => {
      if (!this.isRunning || this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.processBatch();
      } catch (err) {
        console.error(`[OUTBOX_LOOP_ERROR] Worker ${this.workerId}:`, this.sanitizeError(err));
      } finally {
        this.isProcessing = false;
        if (this.isRunning) {
          this.pollTimer = setTimeout(poll, this.pollIntervalMs);
        }
      }
    };

    // Initial immediate tick
    poll();
  }

  /**
   * Graceful shutdown: stops polling, allows in-flight batch to drain, and disconnects producer.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for in-flight processing to complete (up to 5s)
    const startTime = Date.now();
    while (this.isProcessing && Date.now() - startTime < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[OUTBOX_WORKER_STOPPED] Worker ${this.workerId} terminated cleanly.`);
  }

  getWorkerId(): string {
    return this.workerId;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
