import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../permissions/guards';
import {
  listUsersQuerySchema,
  updateRoleSchema,
  updateStatusSchema,
  userIdParamSchema,
} from '../validators/user.validators';
import * as admin from '../controllers/admin.controller';

// ---------------------------------------------------------------------------
// Admin routes — /api/v1/admin/*
// All routes require authentication + Administrator or SuperAdmin role.
// ---------------------------------------------------------------------------

const router = Router();

// GET /api/v1/admin/users
router.get(
  '/users',
  authenticate,
  requireAdmin(),
  validate({ query: listUsersQuerySchema }),
  admin.listUsers,
);

// PATCH /api/v1/admin/users/:id/role
router.patch(
  '/users/:id/role',
  authenticate,
  requireAdmin(),
  validate({ params: userIdParamSchema, body: updateRoleSchema }),
  admin.updateUserRole,
);

// PATCH /api/v1/admin/users/:id/status
router.patch(
  '/users/:id/status',
  authenticate,
  requireAdmin(),
  validate({ params: userIdParamSchema, body: updateStatusSchema }),
  admin.updateUserStatus,
);

export default router;
