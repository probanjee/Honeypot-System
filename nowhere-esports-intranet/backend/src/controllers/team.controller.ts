import { Response, NextFunction } from 'express';
import { teamService } from '../services/team.service';

function actor(req: any) {
  return { id: req.user.id, role: req.user.role };
}

export class TeamController {
  async get(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.getTeam(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await teamService.listTeams(req.query);
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, page: result.page, pageSize: result.pageSize },
      });
    } catch (e) {
      next(e);
    }
  }

  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.createTeam(actor(req), req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.updateTeam(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async archive(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.archiveTeam(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await teamService.deleteTeam(actor(req), req.params.id, req);
      res.json({ success: true, message: 'Team deleted successfully' });
    } catch (e) {
      next(e);
    }
  }

  async assignManager(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.assignManager(actor(req), req.params.id, req.body.manager_id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async assignCoach(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.assignCoach(actor(req), req.params.id, req.body.coach_id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async assignCaptain(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.assignCaptain(actor(req), req.params.id, req.body.captain_id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async addPlayer(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.addPlayer(actor(req), req.params.id, req.body.player_id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async removePlayer(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.removePlayer(actor(req), req.params.id, req.params.playerId, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async addMember(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await teamService.addMember(req.params.id, req.body.emp_id, req.body.role || 'member');
      res.json({ success: true, message: 'Team member added successfully' });
    } catch (e) {
      next(e);
    }
  }

  async removeMember(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await teamService.removeMember(req.params.id, req.params.empId);
      res.json({ success: true, message: 'Team member removed successfully' });
    } catch (e) {
      next(e);
    }
  }

  async getMembers(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.getMembers(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async addManager(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await teamService.addManager(req.params.id, req.body.emp_id);
      res.json({ success: true, message: 'Team manager added successfully' });
    } catch (e) {
      next(e);
    }
  }

  async removeManager(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await teamService.removeManager(req.params.id, req.params.empId);
      res.json({ success: true, message: 'Team manager removed successfully' });
    } catch (e) {
      next(e);
    }
  }

  async getManagers(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await teamService.getManagers(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const teamController = new TeamController();
