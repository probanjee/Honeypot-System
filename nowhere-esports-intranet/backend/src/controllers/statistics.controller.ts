import { Response, NextFunction } from 'express';
import { statisticsService } from '../services/statistics.service';

export class StatisticsController {
  async players(_req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await statisticsService.getPlayerStatistics();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async teams(_req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await statisticsService.getTeamStatistics();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async tournaments(_req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await statisticsService.getTournamentStatistics();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const statisticsController = new StatisticsController();
