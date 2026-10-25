/**
 * VIGILANCE Ingestion Demonstration Consumer
 * Subscribes to `raw-attacks` under consumer group `vigilance-ingestion-group`.
 *
 * Responsibilities:
 * 1. Validates incoming events against `RawAttackEvent` v1.0.0 schema.
 * 2. Deduplicates event IDs using an in-memory cache to handle at-least-once duplicates.
 * 3. Safely routes permanently invalid or malformed messages to `raw-attacks-dlq`.
 * 4. Manually commits offsets to guarantee at-least-once processing.
 */

import { IKafkaConsumer, ConsumerMessage } from './kafkaConsumer.interface.js';
import { IKafkaProducer } from './kafkaProducer.interface.js';
import { validateRawAttackEvent, RawAttackEvent } from '../events/eventContract.js';

export interface IngestionConsumerConfig {
  sourceTopic?: string;
  dlqTopic?: string;
  maxDeduplicationHistory?: number;
  maxRetries?: number;
}

export interface IngestionProcessingStats {
  totalProcessed: number;
  validEvents: number;
  duplicateEvents: number;
  dlqEvents: number;
  retryAttempts: number;
}

export class IngestionDemonstrationConsumer {
  private consumer: IKafkaConsumer;
  private dlqProducer?: IKafkaProducer;
  private sourceTopic: string;
  private dlqTopic: string;
  private maxRetries: number;
  private processedEventIds: Set<string> = new Set();
  private maxDeduplicationHistory: number;

  private stats: IngestionProcessingStats = {
    totalProcessed: 0,
    validEvents: 0,
    duplicateEvents: 0,
    dlqEvents: 0,
    retryAttempts: 0,
  };

  constructor(
    consumer: IKafkaConsumer,
    dlqProducer?: IKafkaProducer,
    config: IngestionConsumerConfig = {}
  ) {
    this.consumer = consumer;
    this.dlqProducer = dlqProducer;
    this.sourceTopic = config.sourceTopic || 'raw-attacks';
    this.dlqTopic = config.dlqTopic || 'raw-attacks-dlq';
    this.maxDeduplicationHistory = config.maxDeduplicationHistory || 10000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Starts consuming from the configured source topic.
   */
  async start(): Promise<void> {
    await this.consumer.subscribe([this.sourceTopic]);
    await this.consumer.run(async (msg: ConsumerMessage) => {
      await this.handleMessage(msg);
    });
    console.log(`[INGESTION_CONSUMER_READY] Listening on topic '${this.sourceTopic}' (Group: vigilance-ingestion-group)`);
  }

  /**
   * Message handling pipeline:
   * Parse -> Deduplicate -> Validate -> Process -> Commit
   */
  async handleMessage(msg: ConsumerMessage): Promise<void> {
    this.stats.totalProcessed++;

    // 1. Safe JSON parsing
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(msg.value);
    } catch {
      console.error(
        `[INGESTION_JSON_CORRUPT] Partition ${msg.partition}@${msg.offset}: Payload is not valid JSON. Routing to DLQ.`
      );
      await this.routeToDlq(msg, 'CORRUPT_JSON_SYNTAX');
      await this.consumer.commitOffset(msg.topic, msg.partition, msg.offset);
      return;
    }

    // 2. Schema Contract Validation
    const validation = validateRawAttackEvent(parsedPayload);
    if (!validation.valid) {
      const errorSummary = validation.errors.join('; ');
      console.warn(
        `[INGESTION_SCHEMA_REJECTED] Partition ${msg.partition}@${msg.offset}: Invalid RawAttackEvent contract: ${errorSummary}. Routing to DLQ.`
      );
      await this.routeToDlq(msg, `SCHEMA_VALIDATION_FAILURE: ${errorSummary}`);
      await this.consumer.commitOffset(msg.topic, msg.partition, msg.offset);
      return;
    }

    const event: RawAttackEvent = validation.event!;

    // 3. Deduplication Check (at-least-once mitigation)
    if (this.processedEventIds.has(event.event_id)) {
      this.stats.duplicateEvents++;
      console.warn(
        `[INGESTION_DUPLICATE_DETECTED] Event ${event.event_id} from ${event.source.ip} was already processed. Suppressing duplicate execution.`
      );
      // Acknowledge and advance offset without re-processing
      await this.consumer.commitOffset(msg.topic, msg.partition, msg.offset);
      return;
    }

    // 4. Structured Processing Demonstration (Phase 2 canonical milestone)
    this.recordProcessedEventId(event.event_id);
    this.stats.validEvents++;

    console.log(
      `[INGESTION_PROCESSED] Event ${event.event_id} | IP: ${event.source.ip}:${event.source.port} | Score: ${event.detection.severity_score} (${event.detection.severity_level}) | Rules: ${event.detection.matched_rules.map(r => r.rule_id).join(',')}`
    );

    // 5. Manual Offset Commit (commit current offset only after successful processing)
    await this.consumer.commitOffset(msg.topic, msg.partition, msg.offset);
  }

  /**
   * Routes poison pills and permanently invalid messages to `raw-attacks-dlq`.
   */
  private async routeToDlq(msg: ConsumerMessage, reason: string): Promise<void> {
    this.stats.dlqEvents++;
    if (!this.dlqProducer) {
      console.warn(`[DLQ_DROPPED] DLQ producer not configured. Dropping poisoned message: ${reason}`);
      return;
    }

    try {
      await this.dlqProducer.send({
        topic: this.dlqTopic,
        key: msg.key || 'dlq-unkeyed',
        value: msg.value,
        headers: {
          'x-dlq-reason': reason.slice(0, 300),
          'x-dlq-timestamp': new Date().toISOString(),
          'x-original-topic': msg.topic,
          'x-original-partition': String(msg.partition),
          'x-original-offset': msg.offset,
        },
      });
      console.log(`[DLQ_ROUTED] Partition ${msg.partition}@${msg.offset} successfully sent to ${this.dlqTopic}`);
    } catch (dlqErr) {
      console.error(`[DLQ_PUBLISH_FAILED] Could not send message to ${this.dlqTopic}:`, dlqErr);
    }
  }

  private recordProcessedEventId(eventId: string): void {
    if (this.processedEventIds.size >= this.maxDeduplicationHistory) {
      // Evict oldest entries
      const firstEntry = this.processedEventIds.values().next().value;
      if (firstEntry) this.processedEventIds.delete(firstEntry);
    }
    this.processedEventIds.add(eventId);
  }

  getStats(): IngestionProcessingStats {
    return { ...this.stats };
  }

  isDuplicate(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  clear(): void {
    this.processedEventIds.clear();
    this.stats = {
      totalProcessed: 0,
      validEvents: 0,
      duplicateEvents: 0,
      dlqEvents: 0,
      retryAttempts: 0,
    };
  }
}
