import { z } from 'zod';

const uuid = z.string().uuid('must be a valid UUID');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const isoDateTime = z.string().datetime({ offset: true, message: 'must be an ISO 8601 datetime' });
const nullableUrl = z.string().url().optional().nullable();
const socialLinksSchema = z.record(z.string().url()).default({});

const playerRoles = [
  'IGL',
  'Duelist',
  'Initiator',
  'Controller',
  'Sentinel',
  'Top',
  'Jungle',
  'Mid',
  'ADC',
  'Support',
  'Flex',
  'Captain',
  'Entry',
  'Sniper',
  'Rifler',
] as const;

export const tournamentFormats = [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'group_stage_playoffs',
] as const;

export const matchStatuses = ['scheduled', 'live', 'delayed', 'completed', 'cancelled'] as const;

export const paginationSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(200).optional(),
  status: z.string().trim().max(50).optional(),
});

export const uuidParamSchema = z.object({
  id: uuid,
});

export const tournamentStandingParamSchema = z.object({
  id: uuid,
});

const createPlayerBaseSchema = z.object({
  id: uuid.optional(),
  employee_id: uuid.optional().nullable(),
  player_tag: z.string().trim().min(1, 'player_tag is required').max(100).optional(),
  in_game_name: z.string().trim().min(1).max(100).optional(),
  real_name: z.string().trim().min(1, 'real_name is required').max(160).optional(),
  age: z.number().int().min(13).max(80).optional().nullable(),
  nationality: z.string().trim().max(100).optional().nullable(),
  role: z.enum(playerRoles),
  current_team: uuid.optional().nullable(),
  join_date: isoDate.optional().nullable(),
  contract_end: isoDate.optional().nullable(),
  preferred_game: z.string().trim().max(100).optional().nullable(),
  avatar_url: nullableUrl,
  social_links: socialLinksSchema.optional(),
  status: z.enum(['active', 'benched', 'bench', 'inactive', 'retired']).default('active'),
});

export const createPlayerSchema = createPlayerBaseSchema.superRefine((value, ctx) => {
  if (!value.player_tag && !value.in_game_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['player_tag'], message: 'player_tag is required' });
  }
  if (!value.real_name && !value.in_game_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['real_name'], message: 'real_name is required' });
  }
  if (value.join_date && value.contract_end && value.contract_end < value.join_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contract_end'], message: 'contract_end cannot be before join_date' });
  }
});

export const updatePlayerSchema = createPlayerBaseSchema.partial().omit({ id: true });

const createCoachBaseSchema = z.object({
  id: uuid.optional(),
  employee_id: uuid.optional().nullable(),
  coach_tag: z.string().trim().max(100).optional().nullable(),
  real_name: z.string().trim().min(1, 'real_name is required').max(160),
  coach_type: z.enum(['head_coach', 'assistant_coach', 'analyst']),
  specialization: z.string().trim().max(160).optional().nullable(),
  current_team: uuid.optional().nullable(),
  social_links: socialLinksSchema.optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const createCoachSchema = createCoachBaseSchema;
export const updateCoachSchema = createCoachBaseSchema.partial().omit({ id: true });

const createTournamentBaseSchema = z.object({
  tournament_code: z.string().trim().min(1).max(50).optional(),
  tournament_name: z.string().trim().min(1, 'tournament_name is required').max(200).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  game: z.string().trim().min(1, 'game is required').max(100),
  format: z.enum(tournamentFormats),
  prize_pool: z.union([z.number().min(0), z.string().trim().max(100)]).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  organizer: z.string().trim().min(1, 'organizer is required').max(200),
  registration_open: isoDateTime.optional().nullable(),
  registration_close: isoDateTime.optional().nullable(),
  start_date: isoDate,
  end_date: isoDate,
  max_teams: z.number().int().min(2).max(1024).optional().nullable(),
  status: z.enum(['draft', 'registration_open', 'published', 'active', 'completed', 'archived', 'cancelled', 'upcoming']).default('draft'),
});

export const createTournamentSchema = createTournamentBaseSchema.superRefine((value, ctx) => {
  if (!value.tournament_name && !value.name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tournament_name'], message: 'tournament_name is required' });
  }
  if (value.start_date > value.end_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'end_date cannot be before start_date' });
  }
  if (value.registration_open && value.registration_close) {
    const open = Date.parse(value.registration_open);
    const close = Date.parse(value.registration_close);
    if (close < open) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registration_close'], message: 'registration_close cannot be before registration_open' });
    }
  }
  if (value.registration_close) {
    const closeDate = value.registration_close.slice(0, 10);
    if (closeDate > value.start_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registration_close'], message: 'registration_close must be on or before start_date' });
    }
  }
});

export const updateTournamentSchema = createTournamentBaseSchema.partial().superRefine((value, ctx) => {
  if (value.start_date && value.end_date && value.start_date > value.end_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'end_date cannot be before start_date' });
  }
});

const playerStatSchema = z.object({
  player_id: uuid,
  team_id: uuid.optional().nullable(),
  kills: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  deaths: z.number().int().min(0).default(0),
  is_mvp: z.boolean().default(false),
});

const createMatchBaseSchema = z.object({
  tournament_id: uuid,
  home_team: uuid.optional(),
  home_team_id: uuid.optional(),
  away_team: uuid.optional().nullable(),
  away_team_id: uuid.optional().nullable(),
  venue: z.string().trim().max(200).optional().nullable(),
  scheduled_at: isoDateTime,
  round: z.string().trim().max(100).optional().nullable(),
  status: z.enum(matchStatuses).default('scheduled'),
  score_home: z.number().int().min(0).default(0),
  score_away: z.number().int().min(0).default(0),
  winner: uuid.optional().nullable(),
  mvp: uuid.optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  referees: z.array(uuid).default([]),
  timeline: z.array(z.record(z.any())).default([]),
  match_code: z.string().trim().max(80).optional(),
  player_statistics: z.array(playerStatSchema).default([]),
});

export const createMatchSchema = createMatchBaseSchema.superRefine((value, ctx) => {
  const home = value.home_team ?? value.home_team_id;
  const away = value.away_team ?? value.away_team_id;

  if (!home) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['home_team'], message: 'home_team is required' });
  }
  if (!away) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['away_team'], message: 'away_team is required' });
  }
  if (home && away && home === away) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['away_team'], message: 'home_team and away_team must be different' });
  }
  if (value.status === 'completed' && value.score_home === value.score_away && value.winner) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['winner'], message: 'winner is not valid for a drawn score' });
  }
});

export const updateMatchSchema = createMatchBaseSchema.partial().superRefine((value, ctx) => {
  const home = value.home_team ?? value.home_team_id;
  const away = value.away_team ?? value.away_team_id;
  if (home && away && home === away) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['away_team'], message: 'home_team and away_team must be different' });
  }
});

export const updateMatchScoreSchema = z.object({
  score_home: z.number().int().min(0),
  score_away: z.number().int().min(0),
  winner: uuid.optional().nullable(),
  mvp: uuid.optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  timeline: z.array(z.record(z.any())).optional(),
  player_statistics: z.array(playerStatSchema).default([]),
}).superRefine((value, ctx) => {
  if (value.score_home === value.score_away && value.winner) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['winner'], message: 'winner is not valid for a drawn score' });
  }
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(matchStatuses),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const createPracticeSchema = z.object({
  team_id: uuid,
  coach_id: uuid.optional().nullable(),
  scheduled_at: isoDateTime,
  duration_minutes: z.number().int().min(15).max(720).default(120),
  focus_area: z.string().trim().min(1).max(200),
  attendance: z.array(z.object({
    player_id: uuid,
    status: z.enum(['present', 'absent', 'late', 'excused']),
    notes: z.string().trim().max(500).optional(),
  })).default([]),
  notes: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
});

export const updatePracticeSchema = createPracticeSchema.partial();
