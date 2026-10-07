import { Request, Response, NextFunction } from 'express';
import { announcementService } from '../services/announcement.service';
import { HTTP_STATUS } from '../constants/http';
import { UserRole } from '../constants/roles';

export class AnnouncementController {
  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const data = await announcementService.createAnnouncement(actorId, req.body, req);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      const data = await announcementService.updateAnnouncement(actorId, id, req.body, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      await announcementService.deleteAnnouncement(actorId, id, req);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Announcement deleted successfully' });
    } catch (e) {
      next(e);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await announcementService.getAnnouncement(id);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const data = await announcementService.getAnnouncementBySlug(slug);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const actorRole = req.user.role;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as string;

      // HR and Administrator roles can list everything including drafts
      if ([UserRole.HR, UserRole.Administrator, UserRole.SuperAdmin].includes(actorRole)) {
        const data = await announcementService.getAnnouncements({ limit, offset, status, showExpired: true });
        res.status(HTTP_STATUS.OK).json({ success: true, data });
      } else {
        // Employees only see published & matching visible announcements
        const data = await announcementService.getVisibleAnnouncements(actorId, { limit, offset });
        res.status(HTTP_STATUS.OK).json({ success: true, data });
      }
    } catch (e) {
      next(e);
    }
  }

  async pin(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      const { pinned = true } = req.body;
      const data = await announcementService.pinAnnouncement(actorId, id, pinned, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async archive(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      const data = await announcementService.archiveAnnouncement(actorId, id, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publish(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      const data = await announcementService.publishAnnouncement(actorId, id, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async trackRead(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = req.user.id;
      const { id } = req.params;
      const data = await announcementService.trackView(id, profileId, req.body);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const announcementController = new AnnouncementController();
