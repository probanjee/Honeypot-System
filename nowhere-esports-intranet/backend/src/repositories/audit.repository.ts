import { supabaseAdmin } from '../config/supabase';
import { AuditEvent, CreateAuditEventData } from '../types/audit';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// AuditRepository — write-only access to the audit_events table.
// The log() method never throws — audit failures must never break the app.
// ---------------------------------------------------------------------------

const TABLE = 'audit_events';

export class AuditRepository {
  /**
   * Appends an event to the audit log.
   * Fire-and-forget — errors are logged but not propagated.
   */
  async log(event: CreateAuditEventData): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from(TABLE).insert({
        actor_id:   event.actor_id ?? null,
        target_id:  event.target_id ?? null,
        action:     event.action,
        metadata:   event.metadata ?? {},
        ip_address: event.ip_address ?? null,
        user_agent: event.user_agent ?? null,
      });

      if (error) {
        logger.warn({ err: error, action: event.action }, 'AuditRepository.log: insert failed');
      }
    } catch (err) {
      logger.warn({ err, action: event.action }, 'AuditRepository.log: unexpected error');
    }
  }

  /**
   * Retrieve audit events for a given user (actor or target).
   */
  async findByUserId(
    userId: string,
    page = 1,
    pageSize = 50,
  ): Promise<{ data: AuditEvent[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabaseAdmin
      .from(TABLE)
      .select('*', { count: 'exact' })
      .or(`actor_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error({ err: error, userId }, 'AuditRepository.findByUserId failed');
      return { data: [], total: 0 };
    }

    return { data: (data ?? []) as AuditEvent[], total: count ?? 0 };
  }
}

export const auditRepository = new AuditRepository();
