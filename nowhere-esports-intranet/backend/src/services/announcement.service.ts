import { announcementRepository } from '../repositories/announcement.repository';
import { auditService } from './audit.service';
import { AuditAction } from '../types/audit';
import { NotFoundError, ValidationError } from '../errors';
import { supabaseAdmin } from '../config/supabase';

export class AnnouncementService {
  async createAnnouncement(actorId: string, input: any, req?: any): Promise<any> {
    const slug = input.slug || this.generateSlug(input.title);

    const announcement = await announcementRepository.create({
      author_id: actorId,
      title: input.title,
      slug,
      content: input.content,
      summary: input.summary || null,
      category: input.category || 'general',
      priority: input.priority || 'medium',
      visibility: input.visibility || 'company',
      visibility_target: input.visibility_target || {},
      publish_at: input.publish_at || new Date().toISOString(),
      expire_at: input.expire_at || null,
      pinned: input.pinned || false,
      status: input.status || 'published',
    });

    await auditService.log(
      AuditAction.ANNOUNCEMENT_CREATED,
      {
        actorId,
        metadata: { announcementId: announcement.id, title: announcement.title },
        req,
      }
    );

    return announcement;
  }

  async updateAnnouncement(actorId: string, id: string, input: any, req?: any): Promise<any> {
    const existing = await announcementRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Announcement not found');
    }

    const updates: any = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.slug !== undefined) updates.slug = input.slug;
    if (input.content !== undefined) updates.content = input.content;
    if (input.summary !== undefined) updates.summary = input.summary;
    if (input.category !== undefined) updates.category = input.category;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.visibility !== undefined) updates.visibility = input.visibility;
    if (input.visibility_target !== undefined) updates.visibility_target = input.visibility_target;
    if (input.publish_at !== undefined) updates.publish_at = input.publish_at;
    if (input.expire_at !== undefined) updates.expire_at = input.expire_at;
    if (input.pinned !== undefined) updates.pinned = input.pinned;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === 'archived') {
        updates.archived_at = new Date().toISOString();
      } else {
        updates.archived_at = null;
      }
    }

    const updated = await announcementRepository.update(id, updates);

    await auditService.log(
      AuditAction.ANNOUNCEMENT_UPDATED,
      {
        actorId,
        metadata: { announcementId: id, updates },
        req,
      }
    );

    return updated;
  }

  async deleteAnnouncement(actorId: string, id: string, req?: any): Promise<void> {
    const existing = await announcementRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Announcement not found');
    }

    await announcementRepository.softDelete(id);

    await auditService.log(
      AuditAction.ANNOUNCEMENT_DELETED,
      {
        actorId,
        metadata: { announcementId: id },
        req,
      }
    );
  }

  async archiveAnnouncement(actorId: string, id: string, req?: any): Promise<any> {
    return this.updateAnnouncement(actorId, id, { status: 'archived' }, req);
  }

  async publishAnnouncement(actorId: string, id: string, req?: any): Promise<any> {
    const announcement = await this.updateAnnouncement(actorId, id, { status: 'published', publish_at: new Date().toISOString() }, req);
    
    // Trigger notification for company or specific targets
    // Fire-and-forget notification triggers
    return announcement;
  }

  async pinAnnouncement(actorId: string, id: string, pinned: boolean, req?: any): Promise<any> {
    return this.updateAnnouncement(actorId, id, { pinned }, req);
  }

  async getAnnouncement(id: string): Promise<any> {
    const announcement = await announcementRepository.findById(id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }
    return announcement;
  }

  async getAnnouncementBySlug(slug: string): Promise<any> {
    const announcement = await announcementRepository.findBySlug(slug);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }
    return announcement;
  }

  async getAnnouncements(options: { limit?: number; offset?: number; status?: string; showExpired?: boolean }): Promise<any[]> {
    return announcementRepository.findAll(options);
  }

  async getVisibleAnnouncements(actorId: string, options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    // Get actor profile info
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, department_id, office_id, role')
      .eq('id', actorId)
      .maybeSingle();

    if (error || !profile) {
      throw new ValidationError('Actor profile not found');
    }

    // Get team assignments for actor
    const { data: teams, error: _teamErr } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('employee_id', actorId);

    const teamIds = (teams || []).map((t: any) => t.team_id);

    return announcementRepository.findVisibleTo(
      profile.id,
      profile.department_id,
      profile.office_id,
      profile.role,
      teamIds,
      options
    );
  }

  // ── Read Tracking ──────────────────────────────────────────────────────────
  async trackView(
    announcementId: string,
    profileId: string,
    details: { opened?: boolean; dismissed?: boolean; read_time?: number }
  ): Promise<any> {
    const existing = await announcementRepository.getReadRecord(announcementId, profileId);

    if (existing) {
      const updates: any = {
        last_viewed_at: new Date().toISOString(),
      };
      if (details.opened !== undefined) updates.opened = details.opened;
      if (details.dismissed !== undefined) updates.dismissed = details.dismissed;
      if (details.read_time !== undefined) {
        updates.read_time = (existing.read_time || 0) + details.read_time;
      }
      return announcementRepository.updateReadRecord(announcementId, profileId, updates);
    } else {
      return announcementRepository.createReadRecord({
        announcement_id: announcementId,
        profile_id: profileId,
        opened: details.opened ?? true,
        dismissed: details.dismissed ?? false,
        read_time: details.read_time ?? 0,
        first_viewed_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
      });
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 6);
  }
}

export const announcementService = new AnnouncementService();
