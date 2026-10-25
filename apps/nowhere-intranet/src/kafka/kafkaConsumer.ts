/**
 * VIGILANCE Kafka Consumer (KafkaJS Implementation)
 * Configures manual offset management and consumer group subscriptions.
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IKafkaConsumer, ConsumerMessage, MessageHandler } from './kafkaConsumer.interface.js';

export interface KafkaConsumerConfig {
  brokers: string[];
  groupId: string;
  clientId?: string;
  fromBeginning?: boolean;
}

export class KafkaConsumer implements IKafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private connected = false;
  private fromBeginning: boolean;

  constructor(config: KafkaConsumerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId || `vigilance-consumer-${process.pid}`,
      brokers: config.brokers,
      connectionTimeout: 5000,
      requestTimeout: 10000,
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    });

    this.fromBeginning = config.fromBeginning ?? true;
    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      allowAutoTopicCreation: false,
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.consumer.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: this.fromBeginning });
    }
  }

  async run(handler: MessageHandler): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    await this.consumer.run({
      autoCommit: false, // Explicit manual offset commit for at-least-once reliability
      eachMessage: async (payload: EachMessagePayload) => {
        const headers: Record<string, string> = {};
        if (payload.message.headers) {
          for (const [k, v] of Object.entries(payload.message.headers)) {
            if (v) headers[k] = v.toString();
          }
        }

        const msg: ConsumerMessage = {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset,
          key: payload.message.key ? payload.message.key.toString() : '',
          value: payload.message.value ? payload.message.value.toString() : '',
          headers,
          timestamp: payload.message.timestamp,
        };

        await handler(msg);
      },
    });
  }

  async commitOffset(topic: string, partition: number, offset: string): Promise<void> {
    // Next offset to read is current offset + 1
    const nextOffset = (BigInt(offset) + 1n).toString();
    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset: nextOffset,
      },
    ]);
  }
}
