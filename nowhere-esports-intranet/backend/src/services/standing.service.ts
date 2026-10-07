import { NotFoundError } from '../errors';
import { matchRepository } from '../repositories/match.repository';
import { standingRepository, StandingRow } from '../repositories/standing.repository';
import { tournamentRepository } from '../repositories/tournament.repository';

type MutableStanding = StandingRow;

function createStanding(tournamentId: string, teamId: string): MutableStanding {
  return {
    tournament_id: tournamentId,
    team_id: teamId,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    maps_won: 0,
    maps_lost: 0,
    matches_played: 0,
    win_rate: 0,
  };
}

export class StandingService {
  async getStandings(tournamentId: string): Promise<any[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament');
    }
    return standingRepository.findByTournament(tournamentId);
  }

  async recalculateTournament(tournamentId: string): Promise<StandingRow[]> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament');
    }

    const matches = await matchRepository.findCompletedByTournament(tournamentId);
    const standings = new Map<string, MutableStanding>();

    for (const match of matches) {
      const homeId = match.home_team_id;
      const awayId = match.away_team_id;
      if (!homeId || !awayId) {
        continue;
      }

      const home = standings.get(homeId) ?? createStanding(tournamentId, homeId);
      const away = standings.get(awayId) ?? createStanding(tournamentId, awayId);
      const scoreHome = Number(match.score_home ?? 0);
      const scoreAway = Number(match.score_away ?? 0);

      home.matches_played += 1;
      away.matches_played += 1;
      home.maps_won += scoreHome;
      home.maps_lost += scoreAway;
      away.maps_won += scoreAway;
      away.maps_lost += scoreHome;

      if (scoreHome === scoreAway) {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      } else if (match.winner === homeId || (!match.winner && scoreHome > scoreAway)) {
        home.wins += 1;
        away.losses += 1;
        home.points += 3;
      } else {
        away.wins += 1;
        home.losses += 1;
        away.points += 3;
      }

      standings.set(homeId, home);
      standings.set(awayId, away);
    }

    const rows = Array.from(standings.values()).map((standing) => ({
      ...standing,
      win_rate: standing.matches_played === 0 ? 0 : Number((standing.wins / standing.matches_played).toFixed(3)),
    }));

    await standingRepository.upsertRows(rows);
    return rows.sort((a, b) => b.points - a.points || b.wins - a.wins || b.maps_won - a.maps_won);
  }
}

export const standingService = new StandingService();
