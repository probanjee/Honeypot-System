import { Router } from 'express';
import { matchController } from '../controllers/match.controller';
import { UserRole } from '../constants/roles';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { requireAnyRole } from '../permissions/guards';
import {
  createMatchSchema,
  paginationSearchSchema,
  updateMatchSchema,
  updateMatchScoreSchema,
  updateMatchStatusSchema,
  uuidParamSchema,
} from '../validators/esports.validators';

const router = Router();
const tournamentAdmins = [UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin];

router.get('/', authenticate, validate({ query: paginationSearchSchema }), matchController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), matchController.get);

router.post(
  '/',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ body: createMatchSchema }),
  matchController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ params: uuidParamSchema, body: updateMatchSchema }),
  matchController.update,
);

router.patch(
  '/:id/score',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ params: uuidParamSchema, body: updateMatchScoreSchema }),
  matchController.updateScore,
);

router.patch(
  '/:id/status',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ params: uuidParamSchema, body: updateMatchStatusSchema }),
  matchController.updateStatus,
);

export default router;
