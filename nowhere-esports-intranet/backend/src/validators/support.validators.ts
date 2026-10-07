import { z } from 'zod';

export const createTicketCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z.string().trim().min(1, 'Code is required').max(50).toUpperCase(),
});

export const createSupportTicketSchema = z.object({
  category_id: z.string().uuid('category_id must be a valid UUID'),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const updateSupportTicketSchema = createSupportTicketSchema.partial().extend({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  assignee_id: z.string().uuid('assignee_id must be a valid UUID').optional().nullable(),
});

export const createTicketCommentSchema = z.object({
  ticket_id: z.string().uuid('ticket_id must be a valid UUID'),
  comment: z.string().trim().min(1, 'Comment text is required'),
});
