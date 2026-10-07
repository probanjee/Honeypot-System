import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class StatisticsRepository {
  async findPlayerMatchStatistics(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('match_player_statistics')
      .select('*, players(*)');

    if (error) {
      logger.error({ err: error }, 'StatisticsRepository.findPlayerMatchStatistics failed');
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
      logger.error({ err: error }, 'StatisticsRepository.findCompletedMatches failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async findMatches(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .is('deleted_at', null);

    if (error) {
      logger.error({ err: error }, 'StatisticsRepository.findMatches failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async findTeams(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .is('deleted_at', null);

    if (error) {
      logger.error({ err: error }, 'StatisticsRepository.findTeams failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async findTournaments(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .is('deleted_at', null);

    if (error) {
      logger.error({ err: error }, 'StatisticsRepository.findTournaments failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async findTournamentTeams(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('tournament_teams')
      .select('tournament_id, team_id, status');

    if (error) {
      logger.error({ err: error }, 'StatisticsRepository.findTournamentTeams failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }
}

export const statisticsRepository = new StatisticsRepository();
