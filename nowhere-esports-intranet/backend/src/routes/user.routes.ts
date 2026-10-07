import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { requireSelfOrAdmin } from '../permissions/guards';
import {
  updateProfileSchema,
  userIdParamSchema,
} from '../validators/user.validators';
import * as user from '../controllers/user.controller';

// ---------------------------------------------------------------------------
// User routes — /api/v1/users/*
// All routes require authentication.
// ---------------------------------------------------------------------------

const router = Router();

// GET /api/v1/users/me
router.get('/me', authenticate, user.getMe);

// PATCH /api/v1/users/me
router.patch(
  '/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  user.updateMe,
);

// GET /api/v1/users/:id  — self or admin
router.get(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema }),
  requireSelfOrAdmin(),
  user.getUserById,
);

// PATCH /api/v1/users/:id — admin only (use /me for self-update)
router.patch(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema, body: updateProfileSchema }),
  requireSelfOrAdmin(),
  user.updateUser,
);

// DELETE /api/v1/users/:id — self or admin
router.delete(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema }),
  requireSelfOrAdmin(),
  user.deleteUser,
);

export default router;
