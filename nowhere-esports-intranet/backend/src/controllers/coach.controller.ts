import { Response, NextFunction } from 'express';
import { coachService } from '../services/coach.service';

function actor(req: any) {
  return { id: req.user.id, role: req.user.role };
}

export class CoachController {
  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await coachService.listCoaches(req.query);
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
      const data = await coachService.getCoach(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await coachService.createCoach(actor(req), req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await coachService.updateCoach(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await coachService.deleteCoach(actor(req), req.params.id, req);
      res.json({ success: true, message: 'Coach deleted successfully' });
    } catch (e) {
      next(e);
    }
  }
}

export const coachController = new CoachController();
