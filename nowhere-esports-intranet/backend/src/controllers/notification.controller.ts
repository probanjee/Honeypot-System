import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HTTP_STATUS } from '../constants/http';

export class NotificationController {
  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const type = req.query.type as string;
      const priority = req.query.priority as string;
      const archived = req.query.archived === 'true';

      const data = await notificationService.getInbox(recipientId, { limit, offset, type, priority, archived });
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async unreadCount(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.user.id;
      const count = await notificationService.getUnreadCount(recipientId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: { count } });
    } catch (e) {
      next(e);
    }
  }

  async markRead(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      const data = await notificationService.markAsRead(actorId, id, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async markAllRead(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      await notificationService.markAllAsRead(actorId, req);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'All notifications marked as read' });
    } catch (e) {
      next(e);
    }
  }

  async archive(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user.id;
      const { id } = req.params;
      const archived = req.body.archived !== false;
      const data = await notificationService.archiveNotification(actorId, id, archived, req);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await notificationService.deleteNotification(id);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Notification deleted successfully' });
    } catch (e) {
      next(e);
    }
  }
}

export const notificationController = new NotificationController();
