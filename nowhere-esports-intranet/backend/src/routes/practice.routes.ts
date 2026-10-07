import { Router } from 'express';
import { practiceController } from '../controllers/practice.controller';
import { UserRole } from '../constants/roles';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { requireAnyRole } from '../permissions/guards';
import { createPracticeSchema, paginationSearchSchema, updatePracticeSchema, uuidParamSchema } from '../validators/esports.validators';

const router = Router();
const practiceManagers = [UserRole.Manager, UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin];

router.get('/', authenticate, validate({ query: paginationSearchSchema }), practiceController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), practiceController.get);

router.post(
  '/',
  authenticate,
  requireAnyRole(...practiceManagers),
  validate({ body: createPracticeSchema }),
  practiceController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireAnyRole(...practiceManagers),
  validate({ params: uuidParamSchema, body: updatePracticeSchema }),
  practiceController.update,
);

router.delete(
  '/:id',
  authenticate,
  requireAnyRole(...practiceManagers),
  validate({ params: uuidParamSchema }),
  practiceController.delete,
);

export default router;
