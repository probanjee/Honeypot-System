import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

type ListOptions = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
};

function pageRange(page = 1, pageSize = 20): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function codeFromName(name: string): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `TRN-${cleaned.slice(0, 28)}-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeTournamentInput(input: any): any {
  const tournamentName = input.tournament_name ?? input.name;
  const payload = { ...input };

  if (tournamentName !== undefined) {
    payload.tournament_name = tournamentName;
    payload.name = tournamentName;
  }
  if (!payload.tournament_code && tournamentName) {
    payload.tournament_code = codeFromName(tournamentName);
  }
  if (payload.prize_pool !== undefined && payload.prize_pool !== null) {
    payload.prize_pool = String(payload.prize_pool);
  }

  return payload;
}

export class TournamentRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'TournamentRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(options: ListOptions = {}): Promise<{ data: any[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const { from, to } = pageRange(page, pageSize);

    let query = supabaseAdmin
      .from('tournaments')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.q) {
      const q = options.q.replace(/[%(),]/g, '');
      query = query.or(`tournament_name.ilike.%${q}%,game.ilike.%${q}%,organizer.ilike.%${q}%,location.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('start_date', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error({ err: error, options }, 'TournamentRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async create(input: any): Promise<any> {
    const payload = normalizeTournamentInput(input);
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input: payload }, 'TournamentRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const payload = normalizeTournamentInput(input);
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input: payload }, 'TournamentRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('tournaments')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'TournamentRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }

  async addTeam(tournamentId: string, teamId: string, seed?: number, groupName?: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('tournament_teams')
      .upsert({
        tournament_id: tournamentId,
        team_id: teamId,
        seed: seed ?? null,
        group_name: groupName ?? null,
        status: 'registered',
      });

    if (error) {
      logger.error({ err: error, tournamentId, teamId }, 'TournamentRepository.addTeam failed');
      throw new DatabaseError(error.message);
    }
  }

  async listTeams(tournamentId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('tournament_teams')
      .select('*, teams(*)')
      .eq('tournament_id', tournamentId)
      .order('seed', { ascending: true });

    if (error) {
      logger.error({ err: error, tournamentId }, 'TournamentRepository.listTeams failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }
}

export const tournamentRepository = new TournamentRepository();
