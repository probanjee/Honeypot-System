/**
 * VIGILANCE In-Memory Mock Kafka Producer
 * Simulates broker partitioning, offset generation, network outages, and delivery ACKs.
 */

import { IKafkaProducer, PublishMessage, PublishResult } from './kafkaProducer.interface.js';

export interface PublishedRecord extends PublishMessage {
  partition: number;
  offset: string;
  publishedAt: Date;
}

export class MockKafkaProducer implements IKafkaProducer {
  private connected = false;
  private shouldFailNext = false;
  private persistentFailure = false;
  private failureError: Error = new Error('KAFKA_BROKER_UNAVAILABLE: Connection refused');
  private topicPartitions: Record<string, number> = {
    'raw-attacks': 3,
    'enriched-attacks': 3,
    'alerts': 1,
    'raw-attacks-dlq': 1,
  };
  private messageStore: Map<string, PublishedRecord[]> = new Map();
  private offsetCounter: Map<string, number> = new Map();

  async connect(): Promise<void> {
    if (this.persistentFailure) {
      throw this.failureError;
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Deterministic murmur-style hash of key into [0, partitions - 1]
   */
  private hashKeyToPartition(key: string, numPartitions: number): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % numPartitions;
  }

  async send(message: PublishMessage): Promise<PublishResult> {
    if (!this.connected || this.persistentFailure || this.shouldFailNext) {
      this.shouldFailNext = false;
      throw this.failureError;
    }

    const numPartitions = this.topicPartitions[message.topic] || 3;
    const partition = this.hashKeyToPartition(message.key, numPartitions);

    const partitionKey = `${message.topic}-${partition}`;
    const currentOffset = this.offsetCounter.get(partitionKey) || 0;
    const nextOffset = currentOffset + 1;
    this.offsetCounter.set(partitionKey, nextOffset);

    const publishedRecord: PublishedRecord = {
      ...message,
      partition,
      offset: String(currentOffset),
      publishedAt: new Date(),
    };

    const topicRecords = this.messageStore.get(message.topic) || [];
    topicRecords.push(publishedRecord);
    this.messageStore.set(message.topic, topicRecords);

    return {
      topic: message.topic,
      partition,
      offset: String(currentOffset),
    };
  }

  // ── Testing & Simulation Helpers ──────────────────────────────────────────

  setFailNext(fail: boolean, customError?: Error): void {
    this.shouldFailNext = fail;
    if (customError) this.failureError = customError;
  }

  setPersistentFailure(fail: boolean, customError?: Error): void {
    this.persistentFailure = fail;
    if (customError) this.failureError = customError;
  }

  getPublishedMessages(topic: string): PublishedRecord[] {
    return this.messageStore.get(topic) || [];
  }

  getAllPublishedMessages(): PublishedRecord[] {
    const all: PublishedRecord[] = [];
    for (const list of this.messageStore.values()) {
      all.push(...list);
    }
    return all;
  }

  clear(): void {
    this.messageStore.clear();
    this.offsetCounter.clear();
    this.shouldFailNext = false;
    this.persistentFailure = false;
  }
}
