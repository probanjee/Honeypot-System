import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable Zod schemas for common request inputs.
// Import these in route-specific validators to compose schemas.
// ---------------------------------------------------------------------------

/** UUID path parameter */
export const uuidParam = z.object({
  id: z.string().uuid({ message: 'ID must be a valid UUID' }),
});

/** Standard pagination query parameters */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** ISO date range query parameters */
export const dateRangeQuery = z.object({
  from: z.string().datetime({ message: 'from must be an ISO 8601 datetime string' }).optional(),
  to: z.string().datetime({ message: 'to must be an ISO 8601 datetime string' }).optional(),
});

/** Sort direction */
export const sortDirectionQuery = z.object({
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

/** Search query string */
export const searchQuery = z.object({
  q: z.string().trim().min(1).max(200).optional(),
});
