import { Router } from 'express';
import { directoryController } from '../controllers/directory.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid employee ID format'),
});

// GET directory search (all authenticated)
router.get('/search', authenticate, directoryController.search);

// GET managers hierarchy tree (all authenticated)
router.get('/hierarchy/:id/managers', authenticate, validate({ params: uuidParamSchema }), directoryController.getManagerTree);

// GET reports hierarchy tree (all authenticated)
router.get('/hierarchy/:id/reports', authenticate, validate({ params: uuidParamSchema }), directoryController.getReportsTree);

export default router;
