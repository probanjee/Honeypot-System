import { UserRole } from '../constants/roles';
import { AuthorizationError, NotFoundError } from '../errors';
import { playerRepository } from '../repositories/player.repository';
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

export class PlayerService {
  async listPlayers(options: any = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const result = await playerRepository.findAll({ ...options, page, pageSize, teamId: options.team_id });
    return { ...result, page, pageSize };
  }

  async getPlayer(id: string): Promise<any> {
    const player = await playerRepository.findById(id);
    if (!player) {
      throw new NotFoundError('Player');
    }
    return player;
  }

  async registerPlayer(actor: Actor, input: any, req?: any): Promise<any> {
    await this.ensureCanManageTargetTeam(actor, input.current_team ?? null);
    const player = await playerRepository.create(input);

    if (player.current_team) {
      await playerRepository.recordTransfer({
        player_id: player.id,
        from_team_id: null,
        to_team_id: player.current_team,
        transferred_by: actor.id,
        reason: 'Initial registration',
      });
    }

    await auditService.log(AuditAction.PLAYER_REGISTERED, {
      actorId: actor.id,
      targetId: player.id,
      metadata: { player_tag: player.player_tag, current_team: player.current_team },
      req,
    });
    return player;
  }

  async updatePlayer(actor: Actor, id: string, input: any, req?: any): Promise<any> {
    const existing = await this.getPlayer(id);
    await this.ensureCanManagePlayer(actor, existing, input.current_team ?? existing.current_team ?? null);

    const isTransfer = input.current_team !== undefined && input.current_team !== existing.current_team;
    const updated = await playerRepository.update(id, input);

    if (isTransfer) {
      await playerRepository.recordTransfer({
        player_id: id,
        from_team_id: existing.current_team ?? null,
        to_team_id: input.current_team ?? null,
        transferred_by: actor.id,
        reason: 'Roster update',
      });
      await auditService.log(AuditAction.PLAYER_TRANSFERRED, {
        actorId: actor.id,
        targetId: id,
        metadata: { from_team: existing.current_team, to_team: input.current_team },
        req,
      });
    } else {
      await auditService.log(AuditAction.PLAYER_UPDATED, {
        actorId: actor.id,
        targetId: id,
        metadata: { fields: Object.keys(input) },
        req,
      });
    }

    if (input.status !== undefined && input.status !== existing.status) {
      await auditService.log(AuditAction.PLAYER_STATUS_CHANGED, {
        actorId: actor.id,
        targetId: id,
        metadata: { from_status: existing.status, to_status: input.status },
        req,
      });
    }

    return updated;
  }

  async transferPlayer(actor: Actor, id: string, teamId: string | null, req?: any): Promise<any> {
    return this.updatePlayer(actor, id, { current_team: teamId, status: teamId ? 'active' : 'benched' }, req);
  }

  async benchPlayer(actor: Actor, id: string, req?: any): Promise<any> {
    return this.updatePlayer(actor, id, { status: 'benched' }, req);
  }

  async activatePlayer(actor: Actor, id: string, req?: any): Promise<any> {
    return this.updatePlayer(actor, id, { status: 'active' }, req);
  }

  async retirePlayer(actor: Actor, id: string, req?: any): Promise<any> {
    return this.updatePlayer(actor, id, { status: 'retired', retired_at: new Date().toISOString() }, req);
  }

  async deletePlayer(actor: Actor, id: string, req?: any): Promise<void> {
    const existing = await this.getPlayer(id);
    await this.ensureCanManagePlayer(actor, existing, existing.current_team ?? null);
    await playerRepository.softDelete(id);
    await auditService.log(AuditAction.PLAYER_DELETED, { actorId: actor.id, targetId: id, req });
  }

  private async ensureCanManageTargetTeam(actor: Actor, teamId: string | null): Promise<void> {
    if (isEsportsAdmin(actor.role)) {
      return;
    }
    if (actor.role !== UserRole.Manager || !teamId) {
      throw new AuthorizationError('You do not have permission to manage players');
    }
    const managedIds = await teamRepository.findManagedTeamIds(actor.id);
    if (!managedIds.includes(teamId)) {
      throw new AuthorizationError('Managers can only manage players on assigned teams');
    }
  }

  private async ensureCanManagePlayer(actor: Actor, player: any, targetTeamId: string | null): Promise<void> {
    if (isEsportsAdmin(actor.role)) {
      return;
    }
    if (actor.role !== UserRole.Manager) {
      throw new AuthorizationError('You do not have permission to manage players');
    }

    const managedIds = await teamRepository.findManagedTeamIds(actor.id);
    const currentTeamId = player.current_team ?? null;
    if ((currentTeamId && managedIds.includes(currentTeamId)) || (targetTeamId && managedIds.includes(targetTeamId))) {
      return;
    }

    throw new AuthorizationError('Managers can only manage players on assigned teams');
  }
}

export const playerService = new PlayerService();
