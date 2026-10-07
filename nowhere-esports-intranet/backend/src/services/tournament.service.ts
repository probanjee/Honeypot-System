import { UserRole } from '../constants/roles';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../errors';
import { tournamentRepository } from '../repositories/tournament.repository';
import { AuditAction } from '../types/audit';
import { auditService } from './audit.service';

type Actor = {
  id: string;
  role: UserRole;
};

function ensureTournamentAdmin(actor: Actor): void {
  if (![UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin].includes(actor.role)) {
    throw new AuthorizationError('Tournament administration privileges are required');
  }
}

export class TournamentService {
  async listTournaments(options: any = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const result = await tournamentRepository.findAll({ ...options, page, pageSize });
    return { ...result, page, pageSize };
  }

  async getTournament(id: string): Promise<any> {
    const tournament = await tournamentRepository.findById(id);
    if (!tournament) {
      throw new NotFoundError('Tournament');
    }
    return {
      ...tournament,
      teams: await tournamentRepository.listTeams(id),
    };
  }

  async createTournament(actor: Actor, input: any, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const tournament = await tournamentRepository.create(input);
    await auditService.log(AuditAction.TOURNAMENT_CREATED, {
      actorId: actor.id,
      targetId: tournament.id,
      metadata: { tournament_name: tournament.tournament_name, game: tournament.game, format: tournament.format },
      req,
    });
    return tournament;
  }

  async updateTournament(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    await this.getExistingTournament(id);
    const tournament = await tournamentRepository.update(id, input);
    await auditService.log(AuditAction.TOURNAMENT_UPDATED, {
      actorId: actor.id,
      targetId: id,
      metadata: { fields: Object.keys(input) },
      req,
    });
    return tournament;
  }

  async publishTournament(actor: Actor, id: string, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const existing = await this.getExistingTournament(id);
    if (['cancelled', 'archived', 'completed'].includes(existing.status)) {
      throw new ConflictError('Only draft or upcoming tournaments can be published');
    }
    const tournament = await tournamentRepository.update(id, { status: 'published' });
    await auditService.log(AuditAction.TOURNAMENT_PUBLISHED, { actorId: actor.id, targetId: id, req });
    return tournament;
  }

  async archiveTournament(actor: Actor, id: string, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    await this.getExistingTournament(id);
    const tournament = await tournamentRepository.update(id, {
      status: 'archived',
      archived_at: new Date().toISOString(),
    });
    await auditService.log(AuditAction.TOURNAMENT_ARCHIVED, { actorId: actor.id, targetId: id, req });
    return tournament;
  }

  async cancelTournament(actor: Actor, id: string, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const existing = await this.getExistingTournament(id);
    if (existing.status === 'completed') {
      throw new ConflictError('Completed tournaments cannot be cancelled');
    }
    const tournament = await tournamentRepository.update(id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    });
    await auditService.log(AuditAction.TOURNAMENT_CANCELLED, { actorId: actor.id, targetId: id, req });
    return tournament;
  }

  async duplicateTournament(actor: Actor, id: string, req?: any): Promise<any> {
    ensureTournamentAdmin(actor);
    const existing = await this.getExistingTournament(id);
    const duplicate = await tournamentRepository.create({
      tournament_name: `${existing.tournament_name ?? existing.name} Copy`,
      game: existing.game,
      format: existing.format,
      prize_pool: existing.prize_pool,
      location: existing.location,
      organizer: existing.organizer,
      registration_open: existing.registration_open,
      registration_close: existing.registration_close,
      start_date: existing.start_date,
      end_date: existing.end_date,
      max_teams: existing.max_teams,
      status: 'draft',
    });
    await auditService.log(AuditAction.TOURNAMENT_CREATED, {
      actorId: actor.id,
      targetId: duplicate.id,
      metadata: { duplicated_from: id },
      req,
    });
    return duplicate;
  }

  async deleteTournament(actor: Actor, id: string, req?: any): Promise<void> {
    ensureTournamentAdmin(actor);
    await this.getExistingTournament(id);
    await tournamentRepository.softDelete(id);
    await auditService.log(AuditAction.TOURNAMENT_ARCHIVED, { actorId: actor.id, targetId: id, req });
  }

  async addTeam(actor: Actor, id: string, input: any): Promise<void> {
    ensureTournamentAdmin(actor);
    const tournament = await this.getExistingTournament(id);
    const teams = await tournamentRepository.listTeams(id);
    if (tournament.max_teams && teams.length >= tournament.max_teams) {
      throw new ValidationError('Tournament has reached max_teams');
    }
    await tournamentRepository.addTeam(id, input.team_id, input.seed, input.group_name);
  }

  private async getExistingTournament(id: string): Promise<any> {
    const tournament = await tournamentRepository.findById(id);
    if (!tournament) {
      throw new NotFoundError('Tournament');
    }
    return tournament;
  }
}

export const tournamentService = new TournamentService();
