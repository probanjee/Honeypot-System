import { Response, NextFunction } from 'express';
import { tournamentService } from '../services/tournament.service';
import { standingService } from '../services/standing.service';

function actor(req: any) {
  return { id: req.user.id, role: req.user.role };
}

export class TournamentController {
  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentService.listTournaments(req.query);
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
      const data = await tournamentService.getTournament(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tournamentService.createTournament(actor(req), req.body, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tournamentService.updateTournament(actor(req), req.params.id, req.body, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publish(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tournamentService.publishTournament(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async archive(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tournamentService.archiveTournament(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async cancel(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tournamentService.cancelTournament(actor(req), req.params.id, req);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async duplicate(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tournamentService.duplicateTournament(actor(req), req.params.id, req);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await tournamentService.deleteTournament(actor(req), req.params.id, req);
      res.json({ success: true, message: 'Tournament archived successfully' });
    } catch (e) {
      next(e);
    }
  }

  async standings(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await standingService.getStandings(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const tournamentController = new TournamentController();
