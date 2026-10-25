/**
 * VIGILANCE Nowhere Esports Intranet - Mongoose Evidence Model
 * Implements MongoDB collection `raw_evidence` with outbox status and 30-day TTL.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { RawEvidenceRecord } from './types.js';

export interface IRawEvidenceDocument extends Document, Omit<RawEvidenceRecord, 'id'> {
  _id: mongoose.Types.ObjectId;
}

const MatchedSignatureSchema = new Schema({
  rule_id: { type: String, required: true },
  rule_name: { type: String, required: true },
  category: { type: String, required: true },
  severity_weight: { type: Number, required: true },
  matched_location: { type: String, required: true },
  extracted_sample: { type: String, required: true },
}, { _id: false });

const RawEvidenceSchema = new Schema<IRawEvidenceDocument>({
  event_id: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  timestamp: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  publish_status: { 
    type: String, 
    required: true, 
    enum: ['PENDING', 'CLAIMED', 'PUBLISHED', 'FAILED'], 
    default: 'PENDING',
    index: true 
  },
  published_at: { 
    type: Date, 
    default: null 
  },
  claimed_at: {
    type: Date,
    default: null
  },
  claimed_by: {
    type: String,
    default: null
  },
  last_error: {
    type: String,
    default: null
  },
  retry_count: { 
    type: Number, 
    default: 0 
  },
  request: {
    method: { type: String, required: true },
    url: { type: String, required: true },
    path: { type: String, required: true },
    query: { type: Schema.Types.Mixed, default: {} },
    headers: { type: Schema.Types.Mixed, default: {} },
    body_raw: { type: String, default: null },
    payload_size_bytes: { type: Number, default: 0 },
  },
  client: {
    remote_ip: { type: String, required: true, index: true },
    remote_port: { type: Number, default: 0 },
    user_agent: { type: String, default: '' },
  },
  detection: {
    matched_signatures: [MatchedSignatureSchema],
    severity_score: { type: Number, required: true },
    severity_level: { 
      type: String, 
      required: true,
      enum: ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    },
    applied_modifiers: [{ type: String }],
  },
}, {
  timestamps: true,
  collection: 'raw_evidence',
});

// Compound index for Outbox reconciler worker and concurrency claiming
RawEvidenceSchema.index({ publish_status: 1, claimed_at: 1, timestamp: 1 });

// TTL index to automatically purge evidence older than 30 days (2,592,000 seconds)
RawEvidenceSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export const RawEvidenceModel: Model<IRawEvidenceDocument> = mongoose.models.RawEvidence || mongoose.model<IRawEvidenceDocument>('RawEvidence', RawEvidenceSchema);
