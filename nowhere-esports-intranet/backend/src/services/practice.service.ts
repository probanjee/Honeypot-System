import { UserRole } from '../constants/roles';
import { AuthorizationError, NotFoundError } from '../errors';
import { practiceRepository } from '../repositories/practice.repository';
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

export class PracticeService {
  async listPractices(options: any = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const result = await practiceRepository.findAll({ ...options, page, pageSize, teamId: options.team_id });
    return { ...result, page, pageSize };
  }

  async getPractice(id: string): Promise<any> {
    const practice = await practiceRepository.findById(id);
    if (!practice) {
      throw new NotFoundError('Practice session');
    }
    return practice;
  }

  async schedulePractice(actor: Actor, input: any, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, input.team_id);
    const practice = await practiceRepository.create(input);
    await auditService.log(AuditAction.PRACTICE_SCHEDULED, {
      actorId: actor.id,
      targetId: practice.id,
      metadata: { team_id: practice.team_id, scheduled_at: practice.scheduled_at },
      req,
    });
    return practice;
  }

  async updatePractice(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    const existing = await this.getPractice(id);
    await this.ensureCanManageTeam(actor, input.team_id ?? existing.team_id);
    const practice = await practiceRepository.update(id, input);
    await auditService.log(AuditAction.PRACTICE_UPDATED, {
      actorId: actor.id,
      targetId: id,
      metadata: { fields: Object.keys(input) },
      req,
    });
    return practice;
  }

  async deletePractice(actor: Actor, id: string, req?: any): Promise<void> {
    const existing = await this.getPractice(id);
    await this.ensureCanManageTeam(actor, existing.team_id);
    await practiceRepository.softDelete(id);
    await auditService.log(AuditAction.PRACTICE_UPDATED, {
      actorId: actor.id,
      targetId: id,
      metadata: { status: 'cancelled' },
      req,
    });
  }

  private async ensureCanManageTeam(actor: Actor, teamId: string): Promise<void> {
    if (isEsportsAdmin(actor.role)) {
      return;
    }
    if (actor.role !== UserRole.Manager) {
      throw new AuthorizationError('You do not have permission to manage practice sessions');
    }
    const managedIds = await teamRepository.findManagedTeamIds(actor.id);
    if (!managedIds.includes(teamId)) {
      throw new AuthorizationError('Managers can only manage practice sessions for assigned teams');
    }
  }
}

export const practiceService = new PracticeService();
