import { Router } from 'express';
import { coachController } from '../controllers/coach.controller';
import { UserRole } from '../constants/roles';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { requireAnyRole } from '../permissions/guards';
import { createCoachSchema, paginationSearchSchema, updateCoachSchema, uuidParamSchema } from '../validators/esports.validators';

const router = Router();
const coachManagers = [UserRole.Manager, UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin];

router.get('/', authenticate, validate({ query: paginationSearchSchema }), coachController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), coachController.get);

router.post(
  '/',
  authenticate,
  requireAnyRole(...coachManagers),
  validate({ body: createCoachSchema }),
  coachController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireAnyRole(...coachManagers),
  validate({ params: uuidParamSchema, body: updateCoachSchema }),
  coachController.update,
);

router.delete(
  '/:id',
  authenticate,
  requireAnyRole(...coachManagers),
  validate({ params: uuidParamSchema }),
  coachController.delete,
);

export default router;
