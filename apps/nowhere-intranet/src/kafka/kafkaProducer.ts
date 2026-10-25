/**
 * VIGILANCE Kafka Producer (KafkaJS Implementation)
 * Configures acks=all (-1) for maximum durability guarantees.
 */

import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { IKafkaProducer, PublishMessage, PublishResult } from './kafkaProducer.interface.js';

export interface KafkaProducerConfig {
  brokers: string[];
  clientId?: string;
  connectionTimeout?: number;
  requestTimeout?: number;
}

export class KafkaProducer implements IKafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private connected = false;

  constructor(config: KafkaProducerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId || 'vigilance-honeypot-producer',
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 5000,
      requestTimeout: config.requestTimeout || 10000,
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    });

    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 1,
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(message: PublishMessage): Promise<PublishResult> {
    if (!this.connected) {
      await this.connect();
    }

    const headersRecord: Record<string, string> = {
      ...(message.headers || {}),
      'x-produced-by': 'vigilance-outbox-publisher',
      'x-produced-at': new Date().toISOString(),
    };

    const metadata = await this.producer.send({
      topic: message.topic,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers: headersRecord,
        },
      ],
      acks: -1, // Wait for leader and all in-sync replicas to acknowledge
      compression: CompressionTypes.None,
    });

    const firstResult = metadata[0];

    return {
      topic: firstResult.topicName,
      partition: firstResult.partition,
      offset: firstResult.offset || '0',
    };
  }
}
