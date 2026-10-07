import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';

export class AnnouncementRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*, author:profiles(id, first_name, last_name, email)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async findBySlug(slug: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*, author:profiles(id, first_name, last_name, email)')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async create(announcement: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert(announcement)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async update(id: string, updates: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('announcements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new DatabaseError(error.message);
  }

  async restore(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async findAll(options: { limit?: number; offset?: number; status?: string; showExpired?: boolean } = {}): Promise<any[]> {
    const { limit = 20, offset = 0, status, showExpired = false } = options;
    let query = supabaseAdmin
      .from('announcements')
      .select('*, author:profiles(id, first_name, last_name, email)')
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw new DatabaseError(error.message);

    let results = data || [];
    if (!showExpired) {
      const nowTime = new Date().getTime();
      results = results.filter((ann) => !ann.expire_at || new Date(ann.expire_at).getTime() > nowTime);
    }

    return results;
  }

  async findAllPublished(): Promise<any[]> {
    return this.findAll({ status: 'published' });
  }

  async findVisibleTo(
    profileId: string,
    departmentId: string | null,
    officeId: string | null,
    role: string,
    teamIds: string[] = [],
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    const { limit = 20, offset = 0 } = options;

    // Fetch all active announcements first, then apply visibility rules in-memory for 100% precision and speed
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*, author:profiles(id, first_name, last_name, email)')
      .eq('status', 'published')
      .is('deleted_at', null)
      .lte('published_at', new Date().toISOString())
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false });

    if (error) throw new DatabaseError(error.message);

    const now = new Date().getTime();
    const filtered = (data || []).filter((ann) => {
      // Expiration check
      if (ann.expire_at && new Date(ann.expire_at).getTime() <= now) {
        return false;
      }

      // Visibility Rules
      if (ann.visibility === 'company') {
        return true;
      }
      if (ann.visibility === 'department') {
        const targetIds = ann.visibility_target?.department_ids || ann.visibility_target?.ids || [];
        return departmentId ? targetIds.includes(departmentId) : false;
      }
      if (ann.visibility === 'office') {
        const targetIds = ann.visibility_target?.office_ids || ann.visibility_target?.ids || [];
        return officeId ? targetIds.includes(officeId) : false;
      }
      if (ann.visibility === 'role') {
        const targetRoles = ann.visibility_target?.roles || [];
        return targetRoles.includes(role);
      }
      if (ann.visibility === 'team') {
        const targetIds = ann.visibility_target?.team_ids || ann.visibility_target?.ids || [];
        return teamIds.some((tid) => targetIds.includes(tid));
      }
      if (ann.visibility === 'employees') {
        const targetIds = ann.visibility_target?.employee_ids || ann.visibility_target?.ids || [];
        return targetIds.includes(profileId);
      }

      return false;
    });

    return filtered.slice(offset, offset + limit);
  }

  // ── Read Tracking ──────────────────────────────────────────────────────────
  async getReadRecord(announcementId: string, profileId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcement_reads')
      .select('*')
      .eq('announcement_id', announcementId)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async createReadRecord(read: {
    announcement_id: string;
    profile_id: string;
    opened?: boolean;
    dismissed?: boolean;
    read_time?: number;
    first_viewed_at?: string;
    last_viewed_at?: string;
  }): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcement_reads')
      .insert(read)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async updateReadRecord(
    announcementId: string,
    profileId: string,
    updates: {
      opened?: boolean;
      dismissed?: boolean;
      read_time?: number;
      last_viewed_at?: string;
    }
  ): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('announcement_reads')
      .update(updates)
      .eq('announcement_id', announcementId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }
}

export const announcementRepository = new AnnouncementRepository();
