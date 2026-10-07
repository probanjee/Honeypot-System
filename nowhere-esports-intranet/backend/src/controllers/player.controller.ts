import { Response, NextFunction } from 'express';
import { playerService } from '../services/player.service';

function actor(req: any) {
  return { id: req.user.id, role: req.user.role };
}

export class PlayerController {
  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await playerService.listPlayers(req.query);
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, page: result.page, pageSize: result.pageSize },
      });
    } catch (e) {
      next(e);
    }
  }

  async get(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.getPlayer(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.registerPlayer(actor(req), req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.updatePlayer(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async bench(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.benchPlayer(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async activate(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.activatePlayer(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async retire(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.retirePlayer(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async transfer(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await playerService.transferPlayer(actor(req), req.params.id, req.body.current_team ?? null, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await playerService.deletePlayer(actor(req), req.params.id, req);
      res.json({ success: true, message: 'Player deleted successfully' });
    } catch (e) {
      next(e);
    }
  }
}

export const playerController = new PlayerController();
