import { Router } from 'express';
import { officeController } from '../controllers/office.controller';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole } from '../permissions/guards';
import { UserRole } from '../constants/roles';
import { validate } from '../middleware/validate';
import { createOfficeSchema, updateOfficeSchema } from '../validators/organization.validators';
import { z } from 'zod';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid office ID format'),
});

// GET list (all authenticated)
router.get('/', authenticate, officeController.list);

// GET by ID (all authenticated)
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), officeController.get);

// POST create (Admin only)
router.post(
  '/',
  authenticate,
  requireMinimumRole(UserRole.Administrator),
  validate({ body: createOfficeSchema }),
  officeController.create
);

// PATCH update (Admin only)
router.patch(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.Administrator),
  validate({ params: uuidParamSchema, body: updateOfficeSchema }),
  officeController.update
);

// DELETE (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.Administrator),
  validate({ params: uuidParamSchema }),
  officeController.delete
);

export default router;
