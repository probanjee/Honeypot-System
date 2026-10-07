import { z } from 'zod';

export const createLeaveTypeSchema = z.object({
  name: z.string().trim().min(1, 'Leave type name is required').max(100),
  code: z.string().trim().min(1, 'Code is required').max(50).toUpperCase(),
  days_allowed: z.number().int().min(1).default(20),
  is_paid: z.boolean().default(true),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

export const createLeaveRequestSchema = z.object({
  leave_type_id: z.string().uuid('leave_type_id must be a valid UUID'),
  start_date: z.string().transform((v) => new Date(v)),
  end_date: z.string().transform((v) => new Date(v)),
  total_days: z.number().min(0.5),
  reason: z.string().trim().min(1, 'Reason is required'),
});

export const updateLeaveRequestSchema = createLeaveRequestSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  approved_by: z.string().uuid('approved_by must be a valid UUID').optional().nullable(),
  comments: z.string().trim().optional().nullable(),
});
