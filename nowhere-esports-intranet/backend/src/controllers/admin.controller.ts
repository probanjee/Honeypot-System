import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

// ---------------------------------------------------------------------------
// AdminController — admin-only operations delegating to UserService.
// All routes protected by requireAdmin() in the router.
// ---------------------------------------------------------------------------

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  // req.query is already parsed and validated by the validate() middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await userService.listUsers(req.query as any);
  sendSuccess(res, result.data, {
    message: 'Users retrieved successfully',
    meta:    result.meta,
  });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.updateUserRole(
    req.user!.id,
    req.params['id']!,
    req.body,
    req,
  );
  sendSuccess(res, profile, { message: 'User role updated successfully' });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.updateUserStatus(
    req.user!.id,
    req.params['id']!,
    req.body,
    req,
  );
  sendSuccess(res, profile, { message: 'User status updated successfully' });
});
