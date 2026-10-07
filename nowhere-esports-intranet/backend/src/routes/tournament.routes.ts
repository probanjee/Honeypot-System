import { Router } from 'express';
import { tournamentController } from '../controllers/tournament.controller';
import { UserRole } from '../constants/roles';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { requireAnyRole } from '../permissions/guards';
import {
  createTournamentSchema,
  paginationSearchSchema,
  updateTournamentSchema,
  uuidParamSchema,
} from '../validators/esports.validators';

const router = Router();
const tournamentAdmins = [UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin];

router.get('/', authenticate, validate({ query: paginationSearchSchema }), tournamentController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), tournamentController.get);
router.get('/:id/standings', authenticate, validate({ params: uuidParamSchema }), tournamentController.standings);

router.post(
  '/',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ body: createTournamentSchema }),
  tournamentController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ params: uuidParamSchema, body: updateTournamentSchema }),
  tournamentController.update,
);

router.post('/:id/publish', authenticate, requireAnyRole(...tournamentAdmins), validate({ params: uuidParamSchema }), tournamentController.publish);
router.post('/:id/archive', authenticate, requireAnyRole(...tournamentAdmins), validate({ params: uuidParamSchema }), tournamentController.archive);
router.post('/:id/cancel', authenticate, requireAnyRole(...tournamentAdmins), validate({ params: uuidParamSchema }), tournamentController.cancel);
router.post('/:id/duplicate', authenticate, requireAnyRole(...tournamentAdmins), validate({ params: uuidParamSchema }), tournamentController.duplicate);

router.delete(
  '/:id',
  authenticate,
  requireAnyRole(...tournamentAdmins),
  validate({ params: uuidParamSchema }),
  tournamentController.delete,
);

export default router;
