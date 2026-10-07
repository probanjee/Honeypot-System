import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { HTTP_STATUS } from '../constants/http';

// ---------------------------------------------------------------------------
// AuthController — thin HTTP layer delegating to AuthService.
// No business logic here.
// ---------------------------------------------------------------------------

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, req);
  sendSuccess(res, result, {
    message:    'Registration successful. Please check your email to verify your account.',
    statusCode: HTTP_STATUS.CREATED,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, req);
  sendSuccess(res, result, { message: 'Login successful' });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.logout(req.user!.id, req);
  sendSuccess(res, result, { message: result.message });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body, req);
  sendSuccess(res, result, { message: result.message });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body, req);
  sendSuccess(res, result, { message: result.message });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshSession(req.body, req);
  sendSuccess(res, result, { message: 'Token refreshed successfully' });
});
