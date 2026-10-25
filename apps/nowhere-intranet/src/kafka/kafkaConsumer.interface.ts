/**
 * VIGILANCE Kafka Consumer Abstraction
 */

export interface ConsumerMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string;
  value: string;
  headers?: Record<string, string>;
  timestamp?: string;
}

export type MessageHandler = (message: ConsumerMessage) => Promise<void>;

export interface IKafkaConsumer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  run(handler: MessageHandler): Promise<void>;
  commitOffset(topic: string, partition: number, offset: string): Promise<void>;
  isConnected(): boolean;
}
