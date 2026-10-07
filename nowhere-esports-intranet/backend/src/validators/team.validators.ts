import { z } from 'zod';

const nullableUrl = z.string().url().optional().nullable();
const socialLinksSchema = z.record(z.string().url()).default({});

const teamSchemaBase = z.object({
  team_name: z.string().trim().min(1, 'team_name is required').max(200).optional(),
  short_name: z.string().trim().min(1, 'short_name is required').max(50).toUpperCase().optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be URL safe').optional(),
  logo_url: nullableUrl,
  banner_url: nullableUrl,
  description: z.string().trim().max(2000).optional().nullable(),
  founded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'founded_date must be YYYY-MM-DD').optional().nullable(),
  region: z.string().trim().max(100).optional().nullable(),
  manager_id: z.string().uuid('manager_id must be a valid UUID').optional().nullable(),
  coach_id: z.string().uuid('coach_id must be a valid UUID').optional().nullable(),
  captain_id: z.string().uuid('captain_id must be a valid UUID').optional().nullable(),
  social_links: socialLinksSchema.optional(),
  name: z.string().trim().min(1, 'Team name is required').max(200).optional(),
  code: z.string().trim().min(1, 'Team code is required').max(50).toUpperCase().optional(),
  type: z.enum(['esports', 'corporate', 'other']).default('esports'),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const createTeamSchema = teamSchemaBase.superRefine((value, ctx) => {
  if (!value.team_name && !value.name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['team_name'], message: 'team_name is required' });
  }
  if (!value.short_name && !value.code) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['short_name'], message: 'short_name is required' });
  }
});

export const updateTeamSchema = teamSchemaBase.partial();

export const addTeamMemberSchema = z.object({
  team_id: z.string().uuid('team_id must be a valid UUID'),
  emp_id: z.string().uuid('emp_id must be a valid UUID'),
  role: z.string().trim().min(1, 'Team role is required'),
});

export const updateTeamMemberSchema = addTeamMemberSchema.partial().omit({ team_id: true, emp_id: true });

export const addTeamPlayerSchema = z.object({
  player_id: z.string().uuid('player_id must be a valid UUID'),
});

export const assignTeamManagerSchema = z.object({
  manager_id: z.string().uuid('manager_id must be a valid UUID'),
});

export const assignTeamCoachSchema = z.object({
  coach_id: z.string().uuid('coach_id must be a valid UUID'),
});

export const assignTeamCaptainSchema = z.object({
  captain_id: z.string().uuid('captain_id must be a valid UUID'),
});
