import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export type StandingRow = {
  tournament_id: string;
  team_id: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  maps_won: number;
  maps_lost: number;
  matches_played: number;
  win_rate: number;
};

export class StandingRepository {
  async findByTournament(tournamentId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('tournament_standings')
      .select('*, teams(*)')
      .eq('tournament_id', tournamentId)
      .order('points', { ascending: false })
      .order('wins', { ascending: false })
      .order('maps_won', { ascending: false });

    if (error) {
      logger.error({ err: error, tournamentId }, 'StandingRepository.findByTournament failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async upsertRows(rows: StandingRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const { error } = await supabaseAdmin
      .from('tournament_standings')
      .upsert(
        rows.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
        { onConflict: 'tournament_id,team_id' },
      );

    if (error) {
      logger.error({ err: error }, 'StandingRepository.upsertRows failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const standingRepository = new StandingRepository();
