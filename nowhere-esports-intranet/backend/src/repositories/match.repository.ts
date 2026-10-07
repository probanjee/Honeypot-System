import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

type ListOptions = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  tournamentId?: string;
  teamId?: string;
};

function pageRange(page = 1, pageSize = 20): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function normalizeMatchInput(input: any): any {
  const payload = { ...input };

  if (input.home_team !== undefined) {
    payload.home_team_id = input.home_team;
    delete payload.home_team;
  }
  if (input.away_team !== undefined) {
    payload.away_team_id = input.away_team;
    delete payload.away_team;
  }
  if (input.mvp !== undefined) {
    payload.mvp = input.mvp;
  }
  delete payload.player_statistics;

  if (!payload.match_code) {
    payload.match_code = `MCH-${Date.now().toString(36).toUpperCase()}`;
  }

  return payload;
}

export class MatchRepository {
  async findById(id: string): Promise<any> {
    const query = supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', id);
    const filteredQuery = typeof (query as any).is === 'function'
      ? query.is('deleted_at', null)
      : query;
    const { data, error } = await filteredQuery.maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'MatchRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(options: ListOptions = {}): Promise<{ data: any[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const { from, to } = pageRange(page, pageSize);

    let query = supabaseAdmin
      .from('matches')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.tournamentId) {
      query = query.eq('tournament_id', options.tournamentId);
    }
    if (options.teamId) {
      query = query.or(`home_team_id.eq.${options.teamId},away_team_id.eq.${options.teamId}`);
    }
    if (options.q) {
      const q = options.q.replace(/[%(),]/g, '');
      query = query.or(`match_code.ilike.%${q}%,venue.ilike.%${q}%,round.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('scheduled_at', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error({ err: error, options }, 'MatchRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async create(input: any): Promise<any> {
    const payload = normalizeMatchInput(input);
    const { data, error } = await supabaseAdmin
      .from('matches')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input: payload }, 'MatchRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const payload = normalizeMatchInput(input);
    const { data, error } = await supabaseAdmin
      .from('matches')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input: payload }, 'MatchRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async savePlayerStatistics(match: any, rows: any[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const payload = rows.map((row) => ({
      match_id: match.id,
      tournament_id: match.tournament_id,
      team_id: row.team_id ?? null,
      player_id: row.player_id,
      kills: row.kills ?? 0,
      assists: row.assists ?? 0,
      deaths: row.deaths ?? 0,
      is_mvp: row.is_mvp ?? row.player_id === match.mvp,
      is_win: row.team_id ? row.team_id === match.winner : false,
    }));

    const { error } = await supabaseAdmin
      .from('match_player_statistics')
      .upsert(payload, { onConflict: 'match_id,player_id' });

    if (error) {
      logger.error({ err: error, matchId: match.id }, 'MatchRepository.savePlayerStatistics failed');
      throw new DatabaseError(error.message);
    }
  }

  async findCompletedByTournament(tournamentId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('completed_at', { ascending: true });

    if (error) {
      logger.error({ err: error, tournamentId }, 'MatchRepository.findCompletedByTournament failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async findCompletedMatches(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('completed_at', { ascending: true });

    if (error) {
      logger.error({ err: error }, 'MatchRepository.findCompletedMatches failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }
}

export const matchRepository = new MatchRepository();
