import { Request, Response, NextFunction } from 'express';
import { officeService } from '../services/office.service';

export class OfficeController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await officeService.getOffice(req.params.id!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await officeService.listOffices();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await officeService.createOffice(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await officeService.updateOffice(req.params.id!, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await officeService.deleteOffice(req.params.id!);
      res.json({ success: true, message: 'Office deleted successfully' });
    } catch (e) {
      next(e);
    }
  }
}

export const officeController = new OfficeController();
