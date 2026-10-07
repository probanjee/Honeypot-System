import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole } from '../permissions/guards';
import { UserRole } from '../constants/roles';
import { validate } from '../middleware/validate';
import { createAnnouncementSchema, updateAnnouncementSchema, trackReadSchema } from '../validators/communication.validators';
import { z } from 'zod';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid announcement ID format'),
});

const slugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

// All authenticated users can list/view announcements
router.get('/', authenticate, announcementController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), announcementController.get);
router.get('/slug/:slug', authenticate, validate({ params: slugParamSchema }), announcementController.getBySlug);

// All authenticated users can track read behavior
router.post(
  '/:id/read',
  authenticate,
  validate({ params: uuidParamSchema, body: trackReadSchema }),
  announcementController.trackRead
);

// Manage announcements (HR / Administrator minimum role)
router.post(
  '/',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ body: createAnnouncementSchema }),
  announcementController.create
);

router.patch(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema, body: updateAnnouncementSchema }),
  announcementController.update
);

router.delete(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  announcementController.delete
);

router.post(
  '/:id/pin',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  announcementController.pin
);

router.post(
  '/:id/archive',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  announcementController.archive
);

router.post(
  '/:id/publish',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  announcementController.publish
);

export default router;
