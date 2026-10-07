import { Request } from 'express';
import { AuditAction, CreateAuditEventData } from '../types/audit';
import { auditRepository } from '../repositories/audit.repository';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// AuditService — business-layer wrapper around AuditRepository.
// All methods are fire-and-forget and never throw.
// ---------------------------------------------------------------------------

export class AuditService {
  /**
   * Log an audit event. Never throws.
   */
  async log(
    action: AuditAction,
    options: {
      actorId?: string | null;
      targetId?: string | null;
      metadata?: Record<string, unknown>;
      req?: Request;
    } = {},
  ): Promise<void> {
    const { actorId, targetId, metadata, req } = options;

    const event: CreateAuditEventData = {
      actor_id:   actorId ?? null,
      target_id:  targetId ?? null,
      action,
      metadata:   metadata ?? {},
      ip_address: req ? this.extractIp(req) : null,
      user_agent: req ? (req.headers['user-agent'] ?? null) : null,
    };

    logger.debug({ action, actorId, targetId }, 'AuditService: logging event');

    // Fire-and-forget
    void auditRepository.log(event);
  }

  private extractIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip?.trim() ?? null;
    }
    return req.socket?.remoteAddress ?? null;
  }
}

export const auditService = new AuditService();
