import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAnyRole } from '../permissions/guards';
import { UserRole } from '../constants/roles';
import { validate } from '../middleware/validate';
import {
  addTeamMemberSchema,
  addTeamPlayerSchema,
  assignTeamCaptainSchema,
  assignTeamCoachSchema,
  assignTeamManagerSchema,
  createTeamSchema,
  updateTeamSchema,
} from '../validators/team.validators';
import { paginationSearchSchema, uuidParamSchema } from '../validators/esports.validators';
import { z } from 'zod';

const router = Router();

const memberParamSchema = z.object({
  id: z.string().uuid('Invalid team ID format'),
  empId: z.string().uuid('Invalid employee ID format'),
});

const playerParamSchema = z.object({
  id: z.string().uuid('Invalid team ID format'),
  playerId: z.string().uuid('Invalid player ID format'),
});

const teamManagers = [
  UserRole.Manager,
  UserRole.TournamentAdmin,
  UserRole.Administrator,
  UserRole.SuperAdmin,
];

const teamAdmins = [UserRole.TournamentAdmin, UserRole.Administrator, UserRole.SuperAdmin];

router.get('/', authenticate, validate({ query: paginationSearchSchema }), teamController.list);
router.get('/:id', authenticate, validate({ params: uuidParamSchema }), teamController.get);
router.get('/:id/members', authenticate, validate({ params: uuidParamSchema }), teamController.getMembers);
router.get('/:id/managers', authenticate, validate({ params: uuidParamSchema }), teamController.getManagers);

router.post(
  '/',
  authenticate,
  requireAnyRole(...teamAdmins),
  validate({ body: createTeamSchema }),
  teamController.create,
);

router.patch(
  '/:id',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema, body: updateTeamSchema }),
  teamController.update,
);

router.post(
  '/:id/archive',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema }),
  teamController.archive,
);

router.delete(
  '/:id',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema }),
  teamController.delete,
);

router.patch(
  '/:id/manager',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema, body: assignTeamManagerSchema }),
  teamController.assignManager,
);

router.patch(
  '/:id/coach',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema, body: assignTeamCoachSchema }),
  teamController.assignCoach,
);

router.patch(
  '/:id/captain',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema, body: assignTeamCaptainSchema }),
  teamController.assignCaptain,
);

router.post(
  '/:id/players',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: uuidParamSchema, body: addTeamPlayerSchema }),
  teamController.addPlayer,
);

router.delete(
  '/:id/players/:playerId',
  authenticate,
  requireAnyRole(...teamManagers),
  validate({ params: playerParamSchema }),
  teamController.removePlayer,
);

router.post(
  '/:id/members',
  authenticate,
  requireAnyRole(...teamAdmins),
  validate({ params: uuidParamSchema, body: addTeamMemberSchema.omit({ team_id: true }) }),
  teamController.addMember,
);

router.delete(
  '/:id/members/:empId',
  authenticate,
  requireAnyRole(...teamAdmins),
  validate({ params: memberParamSchema }),
  teamController.removeMember,
);

router.post(
  '/:id/managers',
  authenticate,
  requireAnyRole(...teamAdmins),
  validate({ params: uuidParamSchema }),
  teamController.addManager,
);

router.delete(
  '/:id/managers/:empId',
  authenticate,
  requireAnyRole(...teamAdmins),
  validate({ params: memberParamSchema }),
  teamController.removeManager,
);

export default router;
