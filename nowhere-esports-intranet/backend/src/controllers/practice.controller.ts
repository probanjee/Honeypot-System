import { Response, NextFunction } from 'express';
import { practiceService } from '../services/practice.service';

function actor(req: any) {
  return { id: req.user.id, role: req.user.role };
}

export class PracticeController {
  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await practiceService.listPractices(req.query);
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
      const data = await practiceService.getPractice(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await practiceService.schedulePractice(actor(req), req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await practiceService.updatePractice(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await practiceService.deletePractice(actor(req), req.params.id, req);
      res.json({ success: true, message: 'Practice session cancelled successfully' });
    } catch (e) {
      next(e);
    }
  }
}

export const practiceController = new PracticeController();
