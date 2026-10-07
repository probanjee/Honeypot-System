import { UserRole } from '../constants/roles';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../errors';
import { matchRepository } from '../repositories/match.repository';
import { tournamentRepository } from '../repositories/tournament.repository';
import { AuditAction } from '../types/audit';
import { auditService } from './audit.service';
import { standingService } from './standing.service';

type Actor = {
  id: string;
  role: UserRole;
};

function ensureTournamentAdmin(actor: Actor): void {
  if (![UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin].includes(actor.role)) {
    throw new AuthorizationError('Tournament administration privileges are required');
  }
}

function normalizeWinner(input: any, match: any): string | null {
  if (input.winner !== undefined) {
    return input.winner;
  }
  if (input.score_home === input.score_away) {
    return null;
  }
  return input.score_home > input.score_away ? match.home_team_id : match.away_team_id;
}

export class MatchService {
  async listMatches(options: any = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const result = await matchRepository.findAll({
      ...options,
      page,
      pageSize,
      tournamentId: options.tournament_id,
      teamId: options.team_id,
    });
    return { ...result, page, pageSize };
  }

  async getMatch(id: string): Promise<any> {
    const match = await matchRepository.findById(id);
    if (!match) {
      throw new NotFoundError('Match');
    }
    return match;
  }

  async createMatch(actor: Actor, input: any, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    await this.validateMatchSchedule(input.tournament_id, input.scheduled_at);
    const match = await matchRepository.create(input);

    await auditService.log(AuditAction.MATCH_SCHEDULED, {
      actorId: actor.id,
      targetId: match.id,
      metadata: { tournament_id: match.tournament_id, scheduled_at: match.scheduled_at },
      req,
    });

    if (input.player_statistics?.length) {
      await matchRepository.savePlayerStatistics(match, input.player_statistics);
    }
    if (match.status === 'completed') {
      await standingService.recalculateTournament(match.tournament_id);
    }

    return match;
  }

  async updateMatch(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const existing = await this.getMatch(id);
    if (input.scheduled_at || input.tournament_id) {
      await this.validateMatchSchedule(input.tournament_id ?? existing.tournament_id, input.scheduled_at ?? existing.scheduled_at);
    }
    const match = await matchRepository.update(id, input);

    if (input.player_statistics?.length) {
      await matchRepository.savePlayerStatistics(match, input.player_statistics);
    }

    await auditService.log(AuditAction.MATCH_UPDATED, {
      actorId: actor.id,
      targetId: id,
      metadata: { fields: Object.keys(input) },
      req,
    });

    if (match.status === 'completed') {
      await standingService.recalculateTournament(match.tournament_id);
    }

    return match;
  }

  async updateScore(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const existing = await this.getMatch(id);
    if (existing.status === 'cancelled') {
      throw new ConflictError('Cancelled matches cannot receive score updates');
    }

    const winner = normalizeWinner(input, existing);
    if (winner && ![existing.home_team_id, existing.away_team_id].includes(winner)) {
      throw new ValidationError('winner must be one of the assigned teams');
    }

    const match = await matchRepository.update(id, {
      score_home: input.score_home,
      score_away: input.score_away,
      winner,
      mvp: input.mvp ?? null,
      notes: input.notes ?? existing.notes ?? null,
      timeline: input.timeline ?? existing.timeline ?? [],
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    await matchRepository.savePlayerStatistics(match, input.player_statistics ?? []);
    await standingService.recalculateTournament(match.tournament_id);

    await auditService.log(AuditAction.MATCH_SCORE_CHANGED, {
      actorId: actor.id,
      targetId: id,
      metadata: {
        score_home: input.score_home,
        score_away: input.score_away,
        winner,
        mvp: input.mvp ?? null,
      },
      req,
    });

    return match;
  }

  async updateStatus(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const existing = await this.getMatch(id);
    const payload: any = {
      status: input.status,
      notes: input.notes ?? existing.notes ?? null,
    };
    if (input.status === 'live' && !existing.started_at) {
      payload.started_at = new Date().toISOString();
    }
    if (input.status === 'completed' && !existing.completed_at) {
      payload.completed_at = new Date().toISOString();
    }

    const match = await matchRepository.update(id, payload);
    if (input.status === 'completed') {
      await standingService.recalculateTournament(match.tournament_id);
    }

    await auditService.log(AuditAction.MATCH_STATUS_CHANGED, {
      actorId: actor.id,
      targetId: id,
      metadata: { from_status: existing.status, to_status: input.status },
      req,
    });
    return match;
  }

  private async validateMatchSchedule(tournamentId: string, scheduledAt: string): Promise<void> {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament');
    }
    const scheduledDate = scheduledAt.slice(0, 10);
    if (scheduledDate < tournament.start_date || scheduledDate > tournament.end_date) {
      throw new ValidationError('Match scheduled_at must fall within the tournament date range');
    }
    if (['cancelled', 'archived'].includes(tournament.status)) {
      throw new ConflictError('Matches cannot be scheduled for cancelled or archived tournaments');
    }
  }
}

export const matchService = new MatchService();
