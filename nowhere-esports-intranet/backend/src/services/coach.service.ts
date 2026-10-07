import { UserRole } from '../constants/roles';
import { AuthorizationError, NotFoundError } from '../errors';
import { coachRepository } from '../repositories/coach.repository';
import { teamRepository } from '../repositories/team.repository';
import { AuditAction } from '../types/audit';
import { auditService } from './audit.service';

type Actor = {
  id: string;
  role: UserRole;
};

function isEsportsAdmin(role: UserRole): boolean {
  return [UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin].includes(role);
}

export class CoachService {
  async listCoaches(options: any = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const result = await coachRepository.findAll({ ...options, page, pageSize, teamId: options.team_id });
    return { ...result, page, pageSize };
  }

  async getCoach(id: string): Promise<any> {
    const coach = await coachRepository.findById(id);
    if (!coach) {
      throw new NotFoundError('Coach');
    }
    return coach;
  }

  async createCoach(actor: Actor, input: any, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, input.current_team ?? null);
    const coach = await coachRepository.create(input);
    if (coach.current_team) {
      await coachRepository.recordHistory({
        coach_id: coach.id,
        team_id: coach.current_team,
        coach_type: coach.coach_type,
      });
    }
    await auditService.log(AuditAction.COACH_CREATED, {
      actorId: actor.id,
      targetId: coach.id,
      metadata: { coach_type: coach.coach_type, current_team: coach.current_team },
      req,
    });
    return coach;
  }

  async updateCoach(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    const existing = await this.getCoach(id);
    await this.ensureCanManageTeam(actor, input.current_team ?? existing.current_team ?? null);
    const updated = await coachRepository.update(id, input);

    if (input.current_team !== undefined && input.current_team !== existing.current_team) {
      await coachRepository.recordHistory({
        coach_id: id,
        team_id: input.current_team ?? null,
        coach_type: input.coach_type ?? existing.coach_type,
        notes: 'Team assignment changed',
      });
      await auditService.log(AuditAction.COACH_ASSIGNED, {
        actorId: actor.id,
        targetId: id,
        metadata: { from_team: existing.current_team, to_team: input.current_team },
        req,
      });
    } else {
      await auditService.log(AuditAction.COACH_UPDATED, {
        actorId: actor.id,
        targetId: id,
        metadata: { fields: Object.keys(input) },
        req,
      });
    }

    return updated;
  }

  async deleteCoach(actor: Actor, id: string, req?: any): Promise<void> {
    const existing = await this.getCoach(id);
    await this.ensureCanManageTeam(actor, existing.current_team ?? null);
    await coachRepository.softDelete(id);
    await auditService.log(AuditAction.COACH_DELETED, { actorId: actor.id, targetId: id, req });
  }

  private async ensureCanManageTeam(actor: Actor, teamId: string | null): Promise<void> {
    if (isEsportsAdmin(actor.role)) {
      return;
    }
    if (actor.role !== UserRole.Manager || !teamId) {
      throw new AuthorizationError('You do not have permission to manage coaches');
    }
    const managedIds = await teamRepository.findManagedTeamIds(actor.id);
    if (!managedIds.includes(teamId)) {
      throw new AuthorizationError('Managers can only manage coaches on assigned teams');
    }
  }
}

export const coachService = new CoachService();
