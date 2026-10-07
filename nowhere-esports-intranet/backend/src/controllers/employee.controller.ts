import { Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';

export class EmployeeController {
  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await employeeService.createEmployee(req.user.id, req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async get(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await employeeService.getEmployee(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await employeeService.updateEmployee(req.user.id, req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deactivate(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await employeeService.deactivateEmployee(req.user.id, req.params.id, req);
      res.json({ success: true, message: 'Employee deactivated successfully' });
    } catch (e) {
      next(e);
    }
  }

  async restore(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await employeeService.restoreEmployee(req.user.id, req.params.id, req);
      res.json({ success: true, message: 'Employee restored successfully' });
    } catch (e) {
      next(e);
    }
  }

  async terminate(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await employeeService.terminateEmployee(req.user.id, req.params.id, req);
      res.json({ success: true, message: 'Employee terminated successfully' });
    } catch (e) {
      next(e);
    }
  }
}

export const employeeController = new EmployeeController();
