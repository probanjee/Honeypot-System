import { statisticsRepository } from '../repositories/statistics.repository';

type TeamAggregate = {
  team_id: string;
  team_name: string | null;
  wins: number;
  losses: number;
  championships: number;
  total_score: number;
  matches_played: number;
  current_streak: string;
};

function nextStreak(current: string, result: 'W' | 'L'): string {
  if (current.startsWith(result)) {
    const count = Number(current.slice(1) || '0') + 1;
    return `${result}${count}`;
  }
  return `${result}1`;
}

export class StatisticsService {
  async getPlayerStatistics(): Promise<any[]> {
    const rows = await statisticsRepository.findPlayerMatchStatistics();
    const grouped = new Map<string, any>();

    for (const row of rows) {
      const current = grouped.get(row.player_id) ?? {
        player_id: row.player_id,
        player_tag: row.players?.player_tag ?? null,
        kills: 0,
        assists: 0,
        deaths: 0,
        mvp_count: 0,
        matches_played: 0,
        wins: 0,
        win_rate: 0,
      };

      current.kills += Number(row.kills ?? 0);
      current.assists += Number(row.assists ?? 0);
      current.deaths += Number(row.deaths ?? 0);
      current.mvp_count += row.is_mvp ? 1 : 0;
      current.matches_played += 1;
      current.wins += row.is_win ? 1 : 0;
      current.win_rate = current.matches_played === 0 ? 0 : Number((current.wins / current.matches_played).toFixed(3));
      grouped.set(row.player_id, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.kills - a.kills || b.mvp_count - a.mvp_count);
  }

  async getTeamStatistics(): Promise<any[]> {
    const [teams, matches, tournaments] = await Promise.all([
      statisticsRepository.findTeams(),
      statisticsRepository.findCompletedMatches(),
      statisticsRepository.findTournaments(),
    ]);

    const grouped = new Map<string, TeamAggregate>();
    for (const team of teams) {
      grouped.set(team.id, {
        team_id: team.id,
        team_name: team.team_name ?? team.name ?? null,
        wins: 0,
        losses: 0,
        championships: 0,
        total_score: 0,
        matches_played: 0,
        current_streak: 'none',
      });
    }

    for (const tournament of tournaments) {
      if (tournament.winner_team_id && grouped.has(tournament.winner_team_id)) {
        grouped.get(tournament.winner_team_id)!.championships += 1;
      }
    }

    for (const match of matches) {
      this.applyTeamMatch(grouped, match.home_team_id, Number(match.score_home ?? 0), match.winner === match.home_team_id);
      this.applyTeamMatch(grouped, match.away_team_id, Number(match.score_away ?? 0), match.winner === match.away_team_id);
    }

    return Array.from(grouped.values()).map((team) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      wins: team.wins,
      losses: team.losses,
      championships: team.championships,
      average_score: team.matches_played === 0 ? 0 : Number((team.total_score / team.matches_played).toFixed(3)),
      current_streak: team.current_streak,
    }));
  }

  async getTournamentStatistics(): Promise<any[]> {
    const [tournaments, matches, tournamentTeams] = await Promise.all([
      statisticsRepository.findTournaments(),
      statisticsRepository.findMatches(),
      statisticsRepository.findTournamentTeams(),
    ]);

    return tournaments.map((tournament) => {
      const allMatches = matches.filter((match) => match.tournament_id === tournament.id);
      const completedMatches = allMatches.filter((match) => match.status === 'completed');
      const teamCount = tournamentTeams.filter((row) => row.tournament_id === tournament.id && row.status !== 'withdrawn').length;
      const scheduledMatchCount = allMatches.length;

      return {
        tournament_id: tournament.id,
        tournament_name: tournament.tournament_name ?? tournament.name,
        matches_played: completedMatches.length,
        teams: teamCount,
        average_viewers: 0,
        completion_percentage: scheduledMatchCount === 0 ? 0 : Number(((completedMatches.length / scheduledMatchCount) * 100).toFixed(2)),
      };
    });
  }

  private applyTeamMatch(grouped: Map<string, TeamAggregate>, teamId: string | null, score: number, won: boolean): void {
    if (!teamId || !grouped.has(teamId)) {
      return;
    }
    const team = grouped.get(teamId)!;
    team.matches_played += 1;
    team.total_score += score;
    if (won) {
      team.wins += 1;
      team.current_streak = nextStreak(team.current_streak, 'W');
    } else {
      team.losses += 1;
      team.current_streak = nextStreak(team.current_streak, 'L');
    }
  }
}

export const statisticsService = new StatisticsService();
