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

function normalizePlayerInput(input: any): any {
  const payload = { ...input };
  const tag = input.player_tag ?? input.in_game_name;
  const realName = input.real_name ?? input.in_game_name;

  if (tag !== undefined) {
    payload.player_tag = tag;
    payload.in_game_name = tag;
  }
  if (realName !== undefined) {
    payload.real_name = realName;
  }
  if (payload.status === 'bench') {
    payload.status = 'benched';
  }
  if (payload.social_links === undefined) {
    payload.social_links = {};
  }

  return payload;
}

export class PlayerRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*, teams(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'PlayerRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(options: ListOptions = {}): Promise<{ data: any[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const { from, to } = pageRange(page, pageSize);

    let query = supabaseAdmin
      .from('players')
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
      query = query.or(`player_tag.ilike.%${q}%,real_name.ilike.%${q}%,nationality.ilike.%${q}%,preferred_game.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('player_tag', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error({ err: error, options }, 'PlayerRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async create(input: any): Promise<any> {
    const payload = normalizePlayerInput(input);
    const { data, error } = await supabaseAdmin
      .from('players')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input: payload }, 'PlayerRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const payload = normalizePlayerInput(input);
    const { data, error } = await supabaseAdmin
      .from('players')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input: payload }, 'PlayerRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('players')
      .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'PlayerRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }

  async recordTransfer(input: {
    player_id: string;
    from_team_id?: string | null;
    to_team_id?: string | null;
    transferred_by?: string | null;
    reason?: string | null;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('player_team_history')
      .insert(input);

    if (error) {
      logger.error({ err: error, input }, 'PlayerRepository.recordTransfer failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const playerRepository = new PlayerRepository();
