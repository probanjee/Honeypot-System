import { Router } from 'express';
import { statisticsController } from '../controllers/statistics.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/players', authenticate, statisticsController.players);
router.get('/teams', authenticate, statisticsController.teams);
router.get('/tournaments', authenticate, statisticsController.tournaments);

export default router;
