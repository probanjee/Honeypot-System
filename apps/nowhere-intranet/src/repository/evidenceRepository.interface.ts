/**
 * VIGILANCE Nowhere Esports Intranet - Evidence Repository Interface
 * Defines the contract for raw evidence and outbox persistence.
 */

import { RawEvidenceRecord } from '../models/types.js';

export interface IEvidenceRepository {
  /**
   * Persists a captured raw attack evidence document and returns the string identifier (MongoDB hex or mock ID).
   */
  saveEvidence(record: RawEvidenceRecord): Promise<string>;

  /**
   * Retrieves an evidence record by its primary raw database ID (MongoDB ObjectId string).
   */
  getEvidenceById(mongoRawId: string): Promise<RawEvidenceRecord | null>;

  /**
   * Retrieves an evidence record by its canonical UUIDv4 event_id.
   */
  getEvidenceByEventId(eventId: string): Promise<RawEvidenceRecord | null>;

  /**
   * Fetches batch of pending outbox events for publishing to Kafka.
   */
  fetchPendingOutbox(limit: number): Promise<RawEvidenceRecord[]>;

  /**
   * Atomically claims pending or abandoned outbox records for a given worker.
   */
  claimPendingOutbox(limit: number, claimTimeoutMs: number, workerId: string): Promise<RawEvidenceRecord[]>;

  /**
   * Marks an outbox record as successfully published to Kafka.
   */
  markPublished(mongoRawId: string, publishedAt: Date): Promise<void>;

  /**
   * Releases claim after failure, incrementing retry count and updating sanitized error reason.
   */
  releaseClaim(mongoRawId: string, errorReason: string, maxRetries: number): Promise<void>;

  /**
   * Increments outbox retry counter and updates error diagnostics.
   */
  incrementRetry(mongoRawId: string, errorReason: string): Promise<void>;

  /**
   * Closes database connection cleanly.
   */
  close(): Promise<void>;
}
