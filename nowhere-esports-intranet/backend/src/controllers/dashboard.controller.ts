import { Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { HTTP_STATUS } from '../constants/http';

export class DashboardController {
  async getSummary(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const data = await dashboardService.getDashboardSummary(userId, role, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getWidgets(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user.role;
      const data = await dashboardService.getDashboardWidgets(role);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const dashboardController = new DashboardController();
