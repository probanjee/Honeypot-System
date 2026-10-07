import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

type ListOptions = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  teamId?: string;
};

function pageRange(page = 1, pageSize = 20): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function normalizeCoachInput(input: any): any {
  const payload = { ...input };
  if (payload.specialization === undefined && payload.coach_type) {
    payload.specialization = payload.coach_type;
  }
  if (payload.social_links === undefined) {
    payload.social_links = {};
  }
  return payload;
}

export class CoachRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('coaches')
      .select('*, teams(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'CoachRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(options: ListOptions = {}): Promise<{ data: any[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const { from, to } = pageRange(page, pageSize);

    let query = supabaseAdmin
      .from('coaches')
      .select('*, teams(*)', { count: 'exact' })
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.teamId) {
      query = query.eq('current_team', options.teamId);
    }
    if (options.q) {
      const q = options.q.replace(/[%(),]/g, '');
      query = query.or(`coach_tag.ilike.%${q}%,real_name.ilike.%${q}%,specialization.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('real_name', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error({ err: error, options }, 'CoachRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async create(input: any): Promise<any> {
    const payload = normalizeCoachInput(input);
    const { data, error } = await supabaseAdmin
      .from('coaches')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input: payload }, 'CoachRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const payload = normalizeCoachInput(input);
    const { data, error } = await supabaseAdmin
      .from('coaches')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input: payload }, 'CoachRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('coaches')
      .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'CoachRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }

  async recordHistory(input: {
    coach_id: string;
    team_id?: string | null;
    coach_type: string;
    started_at?: string;
    ended_at?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('coaching_history')
      .insert(input);

    if (error) {
      logger.error({ err: error, input }, 'CoachRepository.recordHistory failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const coachRepository = new CoachRepository();
