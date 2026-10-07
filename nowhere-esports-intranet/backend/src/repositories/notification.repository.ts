import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';

export class NotificationRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async create(notification: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async findByRecipient(
    recipientId: string,
    options: { limit?: number; offset?: number; type?: string; priority?: string; archived?: boolean } = {}
  ): Promise<any[]> {
    const { limit = 20, offset = 0, type, priority, archived = false } = options;

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('archived', archived);

    if (type) {
      query = query.eq('type', type);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Sort by priority (critical first) and created_at DESC
    // To implement custom priority ordering: we do it in-memory or order by created_at DESC
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw new DatabaseError(error.message);

    // Let's sort critical priority notifications to the top in JS for reliability
    let results = data || [];
    results.sort((a, b) => {
      const priorityWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return results;
  }

  async findUnreadByProfileId(profileId: string): Promise<any[]> {
    const inbox = await this.findByRecipient(profileId, { archived: false });
    return inbox.filter((n) => !n.read_at);
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('archived', false)
      .is('read_at', null);

    if (error) throw new DatabaseError(error.message);
    return count || 0;
  }

  async markAsRead(id: string, readAt: string = new Date().toISOString()): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async markAllAsRead(recipientId: string, readAt: string = new Date().toISOString()): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: readAt })
      .eq('recipient_id', recipientId)
      .eq('archived', false)
      .is('read_at', null);

    if (error) throw new DatabaseError(error.message);
  }

  async archive(id: string, archived: boolean = true): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ archived })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw new DatabaseError(error.message);
  }
}

export const notificationRepository = new NotificationRepository();
