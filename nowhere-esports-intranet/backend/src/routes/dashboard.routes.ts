import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, dashboardController.getSummary);
router.get('/widgets', authenticate, dashboardController.getWidgets);

export default router;
