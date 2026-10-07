import { z } from 'zod';
import { ALL_ROLES } from '../constants/roles';
import { ALLOWED_STATUS_VALUES } from '../constants/profile';

// ---------------------------------------------------------------------------
// User & Admin Zod validators
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'First name cannot be empty')
    .max(100)
    .optional(),
  last_name: z
    .string()
    .trim()
    .min(1, 'Last name cannot be empty')
    .max(100)
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format (e.g. +14155552671)')
    .nullable()
    .optional(),
  designation: z.string().trim().max(200).nullable().optional(),
  timezone: z
    .string()
    .regex(/^[A-Za-z_/]+$/, 'Invalid timezone format (e.g. America/New_York)')
    .optional(),
  avatar_url: z.string().url('avatar_url must be a valid URL').nullable().optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(ALL_ROLES as [string, ...string[]], {
    errorMap: () => ({ message: `Role must be one of: ${ALL_ROLES.join(', ')}` }),
  }),
});

export const updateStatusSchema = z.object({
  status: z.enum(ALLOWED_STATUS_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: `Status must be one of: ${ALLOWED_STATUS_VALUES.join(', ')}` }),
  }),
  reason: z.string().trim().max(500).optional(),
});

export const listUsersQuerySchema = z.object({
  page:          z.coerce.number().int().min(1).default(1),
  pageSize:      z.coerce.number().int().min(1).max(100).default(20),
  role:          z.enum(ALL_ROLES as [string, ...string[]]).optional(),
  status:        z.enum(ALLOWED_STATUS_VALUES as [string, ...string[]]).optional(),
  q:             z.string().trim().max(200).optional(),
  department_id: z.string().uuid('department_id must be a valid UUID').optional(),
  sortBy:        z.enum(['created_at', 'email', 'first_name', 'last_name']).default('created_at'),
  sortDir:       z.enum(['asc', 'desc']).default('desc'),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
});

export type UpdateProfileInput  = z.infer<typeof updateProfileSchema>;
export type UpdateRoleInput     = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput   = z.infer<typeof updateStatusSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
