import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.string().trim().min(1, 'Slug is required').max(200),
  content: z.string().trim().min(1, 'Content is required'),
  summary: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().default('general'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  visibility: z.enum(['company', 'department', 'office', 'role', 'team', 'employees']).default('company'),
  visibility_target: z.record(z.any()).default({}),
  publish_at: z.string().transform((v) => new Date(v)).optional(),
  expire_at: z.string().transform((v) => new Date(v)).optional().nullable(),
  pinned: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const createNotificationSchema = z.object({
  recipient_id: z.string().uuid('Invalid recipient ID').optional().nullable(),
  sender_id: z.string().uuid('Invalid sender ID').optional().nullable(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().trim().min(1, 'Message is required'),
  type: z.enum(['info', 'success', 'warning', 'danger', 'critical', 'reminder', 'approval', 'system', 'security']).default('info'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  action_url: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(100).optional().nullable(),
  metadata: z.record(z.any()).default({}),
});

export const updateNotificationSchema = createNotificationSchema.partial();

export const trackReadSchema = z.object({
  opened: z.boolean().default(true),
  dismissed: z.boolean().default(false),
  read_time: z.number().int().min(0).default(0),
});
