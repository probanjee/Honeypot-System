/**
 * VIGILANCE Nowhere Esports Intranet - Mock Evidence Repository
 * In-memory implementation of IEvidenceRepository for fast, isolated unit testing.
 */

import { IEvidenceRepository } from './evidenceRepository.interface.js';
import { RawEvidenceRecord } from '../models/types.js';

export class MockEvidenceRepository implements IEvidenceRepository {
  private records: Map<string, RawEvidenceRecord> = new Map();
  private idCounter = 1;

  async saveEvidence(record: RawEvidenceRecord): Promise<string> {
    const rawId = `mock_raw_${this.idCounter++}`;
    const copy: RawEvidenceRecord = {
      ...record,
      id: rawId,
    };
    this.records.set(rawId, copy);
    return rawId;
  }

  async getEvidenceById(mongoRawId: string): Promise<RawEvidenceRecord | null> {
    const rec = this.records.get(mongoRawId);
    return rec ? { ...rec } : null;
  }

  async getEvidenceByEventId(eventId: string): Promise<RawEvidenceRecord | null> {
    for (const rec of this.records.values()) {
      if (rec.event_id === eventId) {
        return { ...rec };
      }
    }
    return null;
  }

  async fetchPendingOutbox(limit: number): Promise<RawEvidenceRecord[]> {
    const pending: RawEvidenceRecord[] = [];
    for (const rec of this.records.values()) {
      if (rec.publish_status === 'PENDING') {
        pending.push({ ...rec });
        if (pending.length >= limit) break;
      }
    }
    return pending;
  }

  async claimPendingOutbox(limit: number, claimTimeoutMs: number, workerId: string): Promise<RawEvidenceRecord[]> {
    const claimed: RawEvidenceRecord[] = [];
    const now = Date.now();

    for (const rec of this.records.values()) {
      const isPending = rec.publish_status === 'PENDING';
      const isAbandoned = rec.publish_status === 'CLAIMED' && rec.claimed_at && (now - rec.claimed_at.getTime() > claimTimeoutMs);

      if (isPending || isAbandoned) {
        rec.publish_status = 'CLAIMED';
        rec.claimed_at = new Date();
        rec.claimed_by = workerId;
        claimed.push({ ...rec });

        if (claimed.length >= limit) break;
      }
    }

    return claimed;
  }

  async markPublished(mongoRawId: string, publishedAt: Date): Promise<void> {
    const rec = this.records.get(mongoRawId);
    if (rec) {
      rec.publish_status = 'PUBLISHED';
      rec.published_at = publishedAt;
      rec.claimed_at = null;
      rec.claimed_by = null;
    }
  }

  async releaseClaim(mongoRawId: string, errorReason: string, maxRetries: number): Promise<void> {
    const rec = this.records.get(mongoRawId);
    if (rec) {
      rec.retry_count += 1;
      const isFailed = rec.retry_count >= maxRetries;
      rec.publish_status = isFailed ? 'FAILED' : 'PENDING';
      rec.claimed_at = null;
      rec.claimed_by = null;
      rec.last_error = errorReason.slice(0, 500);
    }
  }

  async incrementRetry(mongoRawId: string, errorReason: string): Promise<void> {
    const rec = this.records.get(mongoRawId);
    if (rec) {
      rec.retry_count += 1;
      rec.last_error = errorReason.slice(0, 500);
    }
  }

  async close(): Promise<void> {
    this.records.clear();
  }

  // Helper for testing
  clear(): void {
    this.records.clear();
    this.idCounter = 1;
  }

  getAllRecords(): RawEvidenceRecord[] {
    return Array.from(this.records.values()).map(r => ({ ...r }));
  }
}
