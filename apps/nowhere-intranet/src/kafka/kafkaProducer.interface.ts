/**
 * VIGILANCE Kafka Producer Abstraction
 */

export interface PublishMessage {
  topic: string;
  key: string;
  value: string;
  headers?: Record<string, string>;
}

export interface PublishResult {
  topic: string;
  partition: number;
  offset: string;
}

export interface IKafkaProducer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: PublishMessage): Promise<PublishResult>;
  isConnected(): boolean;
}
