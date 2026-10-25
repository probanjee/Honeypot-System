/**
 * VIGILANCE Nowhere Esports Intranet - Detection Middleware
 * In-line request classification, scoring, and asynchronous evidence staging.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SignatureEngine } from '../engine/signatureEngine.js';
import { SeverityScorer } from '../engine/scorer.js';
import { IEvidenceRepository } from '../repository/evidenceRepository.interface.js';
import { redactHeaders, redactObject, boundAndRedactRawBody } from '../engine/redaction.js';
import { RawEvidenceRecord, SecurityContext } from '../models/types.js';

// Augment Express Request interface to include securityContext
declare global {
  namespace Express {
    interface Request {
      securityContext?: SecurityContext;
    }
  }
}

export function createDetectionMiddleware(
  signatureEngine: SignatureEngine,
  severityScorer: SeverityScorer,
  evidenceRepo: IEvidenceRepository
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = uuidv4();
      const path = req.path;
      const userAgent = req.headers['user-agent'] as string || '';
      const remoteIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const remotePort = req.socket.remotePort || 0;

      // 1. Run signature evaluation across bounded request surfaces
      const matches = signatureEngine.evaluate({
        path,
        query: req.query as Record<string, unknown>,
        headers: req.headers as Record<string, string>,
        body: req.body,
      });

      // 2. Compute deterministic severity score & contextual modifiers
      const severity = severityScorer.calculate(matches, {
        path,
        userAgent,
      });

      // A request is flagged if severity score > 0 or if canary decoys were hit
      const isSuspicious = severity.clamped_score > 0 || matches.length > 0;

      let mongoRawId: string | undefined;

      // 3. If suspicious, persist immutable raw evidence and outbox record
      if (isSuspicious) {
        const { text: boundedBody, bytes: payloadBytes } = boundAndRedactRawBody(req.body);
        const sanitizedHeaders = redactHeaders(req.headers as Record<string, string>);
        const sanitizedQuery = redactObject(req.query);

        const evidenceRecord: RawEvidenceRecord = {
          event_id: eventId,
          timestamp: new Date(),
          publish_status: 'PENDING',
          published_at: null,
          retry_count: 0,
          request: {
            method: req.method,
            url: req.originalUrl || req.url,
            path,
            query: sanitizedQuery as Record<string, unknown>,
            headers: sanitizedHeaders,
            body_raw: boundedBody,
            payload_size_bytes: payloadBytes,
          },
          client: {
            remote_ip: remoteIp,
            remote_port: remotePort,
            user_agent: userAgent,
          },
          detection: {
            matched_signatures: matches,
            severity_score: severity.clamped_score,
            severity_level: severity.severity_level,
            applied_modifiers: severity.applied_modifiers,
          },
        };

        try {
          mongoRawId = await evidenceRepo.saveEvidence(evidenceRecord);
        } catch (dbErr) {
          // Log explicit database failure without crashing the sensor HTTP request
          console.error(`[EVIDENCE_PERSISTENCE_FAILED] Event ${eventId} failed to persist in evidence store: ${(dbErr as Error).message}`);
        }
      }

      // 4. Attach security context to request for downstream logging or telemetry
      req.securityContext = {
        event_id: eventId,
        timestamp: new Date(),
        is_suspicious: isSuspicious,
        severity,
        matched_signatures: matches,
        mongo_raw_id: mongoRawId,
      };

      next();
    } catch (err) {
      console.error(`[DETECTION_MIDDLEWARE_ERROR] Error evaluating request: ${(err as Error).message}`);
      next(); // Fail open for the honeypot: continue to decoy response
    }
  };
}
