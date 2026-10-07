import { Router } from 'express';
import { playerController } from '../controllers/player.controller';
import { UserRole } from '../constants/roles';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { requireAnyRole } from '../permissions/guards';
import { createPlayerSchema, paginationSearchSchema, updatePlayerSchema, uuidParamSchema } from '../validators/esports.validators';
import { z } from 'zod';

const router = Router();
const rosterManagers = [UserRole.Manager, UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin];
const transferSchema = z.object({ current_team: z.string().uuid().nullable() });

router.get('/', authenticate, validate({ query: paginationSearchSchema }), playerController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), playerController.get);

router.post(
  '/',
  authenticate,
  requireAnyRole(...rosterManagers),
  validate({ body: createPlayerSchema }),
  playerController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireAnyRole(...rosterManagers),
  validate({ params: uuidParamSchema, body: updatePlayerSchema }),
  playerController.update,
);

router.patch(
  '/:id/transfer',
  authenticate,
  requireAnyRole(...rosterManagers),
  validate({ params: uuidParamSchema, body: transferSchema }),
  playerController.transfer,
);

router.post('/:id/bench', authenticate, requireAnyRole(...rosterManagers), validate({ params: uuidParamSchema }), playerController.bench);
router.post('/:id/activate', authenticate, requireAnyRole(...rosterManagers), validate({ params: uuidParamSchema }), playerController.activate);
router.post('/:id/retire', authenticate, requireAnyRole(...rosterManagers), validate({ params: uuidParamSchema }), playerController.retire);

router.delete(
  '/:id',
  authenticate,
  requireAnyRole(...rosterManagers),
  validate({ params: uuidParamSchema }),
  playerController.delete,
);

export default router;
