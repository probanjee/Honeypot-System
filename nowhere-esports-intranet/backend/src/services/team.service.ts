import { UserRole } from '../constants/roles';
import { AuthorizationError, NotFoundError } from '../errors';
import { teamRepository } from '../repositories/team.repository';
import { playerRepository } from '../repositories/player.repository';
import { AuditAction } from '../types/audit';
import { auditService } from './audit.service';

type Actor = {
  id: string;
  role: UserRole;
};

function isEsportsAdmin(role: UserRole): boolean {
  return [UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin].includes(role);
}

export class TeamService {
  async getTeam(id: string): Promise<any> {
    const team = await teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError('Team');
    }
    return {
      ...team,
      players: await teamRepository.getPlayers(id),
    };
  }

  async listTeams(options: any = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const result = await teamRepository.findAll({ ...options, page, pageSize });
    return { ...result, page, pageSize };
  }

  async createTeam(actor: Actor, input: any, req?: any): Promise<any> {
    if (!isEsportsAdmin(actor.role)) {
      throw new AuthorizationError('Only tournament administrators and administrators can create teams');
    }

    const team = await teamRepository.create(input);
    await auditService.log(AuditAction.TEAM_CREATED, {
      actorId: actor.id,
      targetId: team.id,
      metadata: { team_name: team.team_name, short_name: team.short_name },
      req,
    });
    return team;
  }

  async updateTeam(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, id);
    const team = await teamRepository.update(id, input);
    await auditService.log(AuditAction.TEAM_UPDATED, {
      actorId: actor.id,
      targetId: id,
      metadata: { fields: Object.keys(input) },
      req,
    });
    return team;
  }

  async archiveTeam(actor: Actor, id: string, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, id);
    const team = await teamRepository.archive(id);
    await auditService.log(AuditAction.TEAM_ARCHIVED, { actorId: actor.id, targetId: id, req });
    return team;
  }

  async deleteTeam(actor: Actor, id: string, req?: any): Promise<void> {
    await this.ensureCanManageTeam(actor, id);
    await teamRepository.softDelete(id);
    await auditService.log(AuditAction.TEAM_DELETED, { actorId: actor.id, targetId: id, req });
  }

  async assignManager(actor: Actor, teamId: string, managerId: string, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, teamId);
    const team = await teamRepository.assignManager(teamId, managerId);
    await auditService.log(AuditAction.TEAM_UPDATED, {
      actorId: actor.id,
      targetId: teamId,
      metadata: { manager_id: managerId },
      req,
    });
    return team;
  }

  async assignCoach(actor: Actor, teamId: string, coachId: string, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, teamId);
    const team = await teamRepository.assignCoach(teamId, coachId);
    await auditService.log(AuditAction.COACH_ASSIGNED, {
      actorId: actor.id,
      targetId: coachId,
      metadata: { team_id: teamId },
      req,
    });
    return team;
  }

  async assignCaptain(actor: Actor, teamId: string, captainId: string, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, teamId);
    const team = await teamRepository.assignCaptain(teamId, captainId);
    await auditService.log(AuditAction.TEAM_UPDATED, {
      actorId: actor.id,
      targetId: teamId,
      metadata: { captain_id: captainId },
      req,
    });
    return team;
  }

  async addPlayer(actor: Actor, teamId: string, playerId: string, req?: any): Promise<any> {
    const team = await this.ensureCanManageTeam(actor, teamId);
    const player = await playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError('Player');
    }

    await playerRepository.recordTransfer({
      player_id: playerId,
      from_team_id: player.current_team ?? null,
      to_team_id: teamId,
      transferred_by: actor.id,
      reason: 'Team assignment',
    });
    const updated = await teamRepository.addPlayer(teamId, playerId);
    await auditService.log(AuditAction.TEAM_PLAYER_ADDED, {
      actorId: actor.id,
      targetId: team.id,
      metadata: { player_id: playerId },
      req,
    });
    return updated;
  }

  async removePlayer(actor: Actor, teamId: string, playerId: string, req?: any): Promise<any> {
    await this.ensureCanManageTeam(actor, teamId);
    const updated = await teamRepository.removePlayer(teamId, playerId);
    await auditService.log(AuditAction.TEAM_PLAYER_REMOVED, {
      actorId: actor.id,
      targetId: teamId,
      metadata: { player_id: playerId },
      req,
    });
    return updated;
  }

  async addMember(teamId: string, empId: string, role: string): Promise<void> {
    await this.getExistingTeam(teamId);
    await teamRepository.addMember(teamId, empId, role);
  }

  async removeMember(teamId: string, empId: string): Promise<void> {
    await this.getExistingTeam(teamId);
    await teamRepository.removeMember(teamId, empId);
  }

  async getMembers(teamId: string): Promise<any[]> {
    await this.getExistingTeam(teamId);
    return teamRepository.getMembers(teamId);
  }

  async addManager(teamId: string, empId: string): Promise<void> {
    await this.getExistingTeam(teamId);
    await teamRepository.addManager(teamId, empId);
  }

  async removeManager(teamId: string, empId: string): Promise<void> {
    await this.getExistingTeam(teamId);
    await teamRepository.removeManager(teamId, empId);
  }

  async getManagers(teamId: string): Promise<any[]> {
    await this.getExistingTeam(teamId);
    return teamRepository.getManagers(teamId);
  }

  private async getExistingTeam(id: string): Promise<any> {
    const team = await teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError('Team');
    }
    return team;
  }

  private async ensureCanManageTeam(actor: Actor, teamId: string): Promise<any> {
    const team = await this.getExistingTeam(teamId);
    if (isEsportsAdmin(actor.role)) {
      return team;
    }
    if (actor.role === UserRole.Manager && team.manager_id === actor.id) {
      return team;
    }
    throw new AuthorizationError('You do not have permission to manage this team');
  }
}

export const teamService = new TeamService();
