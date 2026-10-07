import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

type ListOptions = {
  page?: number;
  pageSize?: number;
  status?: string;
  teamId?: string;
};

function pageRange(page = 1, pageSize = 20): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export class PracticeRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('practice_sessions')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'PracticeRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(options: ListOptions = {}): Promise<{ data: any[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const { from, to } = pageRange(page, pageSize);

    let query = supabaseAdmin
      .from('practice_sessions')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.teamId) {
      query = query.eq('team_id', options.teamId);
    }

    const { data, error, count } = await query
      .order('scheduled_at', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error({ err: error, options }, 'PracticeRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async create(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('practice_sessions')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'PracticeRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('practice_sessions')
      .update(input)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input }, 'PracticeRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('practice_sessions')
      .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'PracticeRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const practiceRepository = new PracticeRepository();
