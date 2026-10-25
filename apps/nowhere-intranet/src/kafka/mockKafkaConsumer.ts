/**
 * VIGILANCE In-Memory Mock Kafka Consumer
 * Simulates consumer group subscriptions, partition consumption, and manual offset commits.
 */

import { IKafkaConsumer, ConsumerMessage, MessageHandler } from './kafkaConsumer.interface.js';

export class MockKafkaConsumer implements IKafkaConsumer {
  private connected = false;
  private subscribedTopics: Set<string> = new Set();
  private handler: MessageHandler | null = null;
  private committedOffsets: Map<string, string> = new Map(); // key: "topic-partition" -> offset
  private processedMessages: ConsumerMessage[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handler = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async subscribe(topics: string[]): Promise<void> {
    for (const t of topics) {
      this.subscribedTopics.add(t);
    }
  }

  async run(handler: MessageHandler): Promise<void> {
    this.handler = handler;
  }

  async commitOffset(topic: string, partition: number, offset: string): Promise<void> {
    this.committedOffsets.set(`${topic}-${partition}`, offset);
  }

  // ── Testing & Simulation Helpers ──────────────────────────────────────────

  /**
   * Simulates arrival of a message from the broker to the registered handler.
   */
  async simulateMessageArrival(msg: ConsumerMessage): Promise<void> {
    if (!this.handler) {
      throw new Error('[MOCK_CONSUMER] No message handler registered. Call run() first.');
    }
    this.processedMessages.push(msg);
    await this.handler(msg);
  }

  getCommittedOffset(topic: string, partition: number): string | undefined {
    return this.committedOffsets.get(`${topic}-${partition}`);
  }

  getProcessedMessages(): ConsumerMessage[] {
    return [...this.processedMessages];
  }

  clear(): void {
    this.processedMessages = [];
    this.committedOffsets.clear();
  }
}
