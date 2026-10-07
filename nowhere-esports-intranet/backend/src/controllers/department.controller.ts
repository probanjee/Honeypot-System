import { Request, Response, NextFunction } from 'express';
import { departmentService } from '../services/department.service';

export class DepartmentController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.getDepartment(req.params.id!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.listDepartments();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.createDepartment(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.updateDepartment(req.params.id!, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await departmentService.deleteDepartment(req.params.id!);
      res.json({ success: true, message: 'Department deleted successfully' });
    } catch (e) {
      next(e);
    }
  }

  async statistics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.getStatistics();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const departmentController = new DepartmentController();
