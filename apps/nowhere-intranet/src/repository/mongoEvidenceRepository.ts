/**
 * VIGILANCE Nowhere Esports Intranet - MongoDB Evidence Repository (Mongoose)
 * Implements IEvidenceRepository for persistence to MongoDB.
 * Fails fast on connection errors; never silently drops to in-memory mode.
 */

import mongoose from 'mongoose';
import { IEvidenceRepository } from './evidenceRepository.interface.js';
import { RawEvidenceModel, IRawEvidenceDocument } from '../models/rawEvidence.model.js';
import { RawEvidenceRecord } from '../models/types.js';

export interface MongoRepositoryOptions {
  uri?: string;
  dbName?: string;
  serverSelectionTimeoutMS?: number;
}

export class MongoEvidenceRepository implements IEvidenceRepository {
  private isConnected = false;

  constructor(private options: MongoRepositoryOptions = {}) {}

  /**
   * Explicitly establishes MongoDB connection via Mongoose.
   * Throws an error immediately if connection fails.
   */
  async connect(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      return;
    }

    const uri = this.options.uri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = this.options.dbName || process.env.MONGO_DB_NAME || 'vigilance_evidence';
    const timeout = this.options.serverSelectionTimeoutMS || 5000;

    try {
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: timeout,
        autoIndex: true,
      });
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      throw new Error(`[MONGO_CONNECTION_FAILED] Failed to connect to MongoDB at ${sanitizedUri}/${dbName}: ${(error as Error).message}`);
    }
  }

  async saveEvidence(record: RawEvidenceRecord): Promise<string> {
    this.ensureConnected();
    const doc = new RawEvidenceModel({
      event_id: record.event_id,
      timestamp: record.timestamp,
      publish_status: record.publish_status,
      published_at: record.published_at,
      retry_count: record.retry_count,
      request: record.request,
      client: record.client,
      detection: record.detection,
    });

    const saved = await doc.save();
    return saved._id.toString();
  }

  async getEvidenceById(mongoRawId: string): Promise<RawEvidenceRecord | null> {
    this.ensureConnected();
    if (!mongoose.Types.ObjectId.isValid(mongoRawId)) {
      return null;
    }
    const doc = await RawEvidenceModel.findById(mongoRawId).lean().exec();
    return doc ? this.mapDocToRecord(doc as unknown as IRawEvidenceDocument) : null;
  }

  async getEvidenceByEventId(eventId: string): Promise<RawEvidenceRecord | null> {
    this.ensureConnected();
    const doc = await RawEvidenceModel.findOne({ event_id: eventId }).lean().exec();
    return doc ? this.mapDocToRecord(doc as unknown as IRawEvidenceDocument) : null;
  }

  async fetchPendingOutbox(limit: number): Promise<RawEvidenceRecord[]> {
    this.ensureConnected();
    const docs = await RawEvidenceModel.find({ publish_status: 'PENDING' })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean()
      .exec();

    return docs.map(doc => this.mapDocToRecord(doc as unknown as IRawEvidenceDocument));
  }

  async claimPendingOutbox(limit: number, claimTimeoutMs: number, workerId: string): Promise<RawEvidenceRecord[]> {
    this.ensureConnected();
    const claimThreshold = new Date(Date.now() - claimTimeoutMs);
    const claimedRecords: RawEvidenceRecord[] = [];

    for (let i = 0; i < limit; i++) {
      // Atomic find and update prevents race condition among concurrent workers
      const doc = await RawEvidenceModel.findOneAndUpdate(
        {
          $or: [
            { publish_status: 'PENDING' },
            { publish_status: 'CLAIMED', claimed_at: { $lt: claimThreshold } },
          ],
        },
        {
          $set: {
            publish_status: 'CLAIMED',
            claimed_at: new Date(),
            claimed_by: workerId,
          },
        },
        { new: true, sort: { timestamp: 1 } }
      ).lean().exec();

      if (!doc) break;
      claimedRecords.push(this.mapDocToRecord(doc as unknown as IRawEvidenceDocument));
    }

    return claimedRecords;
  }

  async markPublished(mongoRawId: string, publishedAt: Date): Promise<void> {
    this.ensureConnected();
    if (!mongoose.Types.ObjectId.isValid(mongoRawId)) return;
    await RawEvidenceModel.findByIdAndUpdate(mongoRawId, {
      $set: {
        publish_status: 'PUBLISHED',
        published_at: publishedAt,
        claimed_at: null,
        claimed_by: null,
      },
    }).exec();
  }

  async releaseClaim(mongoRawId: string, errorReason: string, maxRetries: number): Promise<void> {
    this.ensureConnected();
    if (!mongoose.Types.ObjectId.isValid(mongoRawId)) return;

    const doc = await RawEvidenceModel.findById(mongoRawId).exec();
    if (!doc) return;

    const nextRetry = (doc.retry_count || 0) + 1;
    const isFailed = nextRetry >= maxRetries;

    await RawEvidenceModel.findByIdAndUpdate(mongoRawId, {
      $set: {
        publish_status: isFailed ? 'FAILED' : 'PENDING',
        claimed_at: null,
        claimed_by: null,
        last_error: errorReason.slice(0, 500),
      },
      $inc: { retry_count: 1 },
    }).exec();
  }

  async incrementRetry(mongoRawId: string, errorReason: string): Promise<void> {
    this.ensureConnected();
    if (!mongoose.Types.ObjectId.isValid(mongoRawId)) return;
    await RawEvidenceModel.findByIdAndUpdate(mongoRawId, {
      $inc: { retry_count: 1 },
      $set: { last_error: errorReason.slice(0, 500) },
    }).exec();
  }

  async close(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    this.isConnected = false;
  }

  private ensureConnected(): void {
    if (!this.isConnected || mongoose.connection.readyState !== 1) {
      throw new Error('[MONGO_NOT_CONNECTED] Attempted MongoDB operation while not connected. Call connect() first.');
    }
  }

  private mapDocToRecord(doc: IRawEvidenceDocument): RawEvidenceRecord {
    return {
      id: doc._id.toString(),
      event_id: doc.event_id,
      timestamp: doc.timestamp,
      publish_status: doc.publish_status,
      published_at: doc.published_at,
      retry_count: doc.retry_count,
      request: doc.request,
      client: doc.client,
      detection: doc.detection,
    };
  }
}
