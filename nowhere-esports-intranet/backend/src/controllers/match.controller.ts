import { Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';

function actor(req: any) {
  return { id: req.user.id, role: req.user.role };
}

export class MatchController {
  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchService.listMatches(req.query);
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
      const data = await matchService.getMatch(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await matchService.createMatch(actor(req), req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await matchService.updateMatch(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateScore(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await matchService.updateScore(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateStatus(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await matchService.updateStatus(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const matchController = new MatchController();
