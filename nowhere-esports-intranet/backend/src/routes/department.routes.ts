import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole } from '../permissions/guards';
import { UserRole } from '../constants/roles';
import { validate } from '../middleware/validate';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/organization.validators';
import { z } from 'zod';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid department ID format'),
});

// GET statistics (all authenticated)
router.get('/statistics', authenticate, departmentController.statistics);

// GET list (all authenticated)
router.get('/', authenticate, departmentController.list);

// GET by ID (all authenticated)
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), departmentController.get);

// POST create (Admin only)
router.post(
  '/',
  authenticate,
  requireMinimumRole(UserRole.Administrator),
  validate({ body: createDepartmentSchema }),
  departmentController.create
);

// PATCH update (Admin only)
router.patch(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.Administrator),
  validate({ params: uuidParamSchema, body: updateDepartmentSchema }),
  departmentController.update
);

// DELETE (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.Administrator),
  validate({ params: uuidParamSchema }),
  departmentController.delete
);

export default router;
