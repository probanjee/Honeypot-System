import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { HTTP_STATUS } from '../constants/http';

// ---------------------------------------------------------------------------
// UserController — thin HTTP layer delegating to UserService.
// ---------------------------------------------------------------------------

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getProfile(req.user!.id);
  sendSuccess(res, profile, { message: 'Profile retrieved successfully' });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.updateProfile(req.user!.id, req.body, req);
  sendSuccess(res, profile, { message: 'Profile updated successfully' });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getProfile(req.params['id']!);
  sendSuccess(res, profile, { message: 'User retrieved successfully' });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.updateProfile(req.params['id']!, req.body, req);
  sendSuccess(res, profile, { message: 'User updated successfully' });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteAccount(
    req.user!.id,
    req.params['id']!,
    req.user!.role,
    req,
  );
  sendSuccess(res, null, {
    message:    'Account deleted successfully',
    statusCode: HTTP_STATUS.OK,
  });
});
