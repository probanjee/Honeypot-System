import { Request, Response, NextFunction } from 'express';
import { directoryService } from '../services/directory.service';
import { hierarchyService } from '../services/hierarchy.service';

export class DirectoryController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await directoryService.search(req.query as any);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async getManagerTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hierarchyService.getManagerTree(req.params.id!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getReportsTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hierarchyService.getReportsTree(req.params.id!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const directoryController = new DirectoryController();
