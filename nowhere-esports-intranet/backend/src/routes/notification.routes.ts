import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

router.get('/', authenticate, notificationController.list);
router.get('/unread-count', authenticate, notificationController.unreadCount);

router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllRead
);

router.patch(
  '/:id/read',
  authenticate,
  validate({ params: uuidParamSchema }),
  notificationController.markRead
);

router.patch(
  '/:id/archive',
  authenticate,
  validate({ params: uuidParamSchema, body: z.object({ archived: z.boolean().default(true) }) }),
  notificationController.archive
);

router.delete(
  '/:id',
  authenticate,
  validate({ params: uuidParamSchema }),
  notificationController.delete
);

export default router;
