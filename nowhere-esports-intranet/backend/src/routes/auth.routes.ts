import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { loginRateLimit, forgotPasswordRateLimit } from '../middleware/loginRateLimit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} from '../validators/auth.validators';
import * as auth from '../controllers/auth.controller';

// ---------------------------------------------------------------------------
// Auth routes — /api/v1/auth/*
// ---------------------------------------------------------------------------

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  loginRateLimit,
  validate({ body: registerSchema }),
  auth.register,
);

// POST /api/v1/auth/login
router.post(
  '/login',
  loginRateLimit,
  validate({ body: loginSchema }),
  auth.login,
);

// POST /api/v1/auth/logout  (requires valid session)
router.post('/logout', authenticate, auth.logout);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPasswordRateLimit,
  validate({ body: forgotPasswordSchema }),
  auth.forgotPassword,
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  auth.resetPassword,
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  auth.refresh,
);

export default router;
