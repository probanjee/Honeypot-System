import { z } from 'zod';

export const createKbCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z.string().trim().min(1, 'Code is required').max(50).toUpperCase(),
  description: z.string().trim().optional().nullable(),
  parent_id: z.string().uuid('parent_id must be a valid UUID').optional().nullable(),
});

export const createKbArticleSchema = z.object({
  category_id: z.string().uuid('category_id must be a valid UUID'),
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.string().trim().min(1, 'Slug is required').max(200),
  content: z.string().trim().min(1, 'Content is required'),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateKbArticleSchema = createKbArticleSchema.partial().omit({ slug: true });
