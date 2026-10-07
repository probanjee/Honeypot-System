-- =============================================================================
-- Migration 021: Esports management platform
-- =============================================================================
-- Expands the earlier activity-tracking schema into the production tournament,
-- roster, practice, standings, and statistics model used by Milestone 6.

-- ── Teams ───────────────────────────────────────────────────────────────────
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS founded_date DATE,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coach_id UUID,
  ADD COLUMN IF NOT EXISTS captain_id UUID,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE public.teams
SET
  team_name = COALESCE(team_name, name),
  short_name = COALESCE(short_name, code),
  slug = COALESCE(slug, lower(regexp_replace(COALESCE(name, code, id::text), '[^a-zA-Z0-9]+', '-', 'g')))
WHERE team_name IS NULL OR short_name IS NULL OR slug IS NULL;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_status_check
  CHECK (status IN ('active', 'inactive', 'archived', 'deleted'));

CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_unique_idx ON public.teams(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS teams_search_idx ON public.teams USING gin (
  to_tsvector('simple', COALESCE(team_name, '') || ' ' || COALESCE(short_name, '') || ' ' || COALESCE(region, ''))
);
CREATE INDEX IF NOT EXISTS teams_manager_idx ON public.teams(manager_id) WHERE deleted_at IS NULL;

-- ── Players ─────────────────────────────────────────────────────────────────
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_id_fkey;
ALTER TABLE public.players ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player_tag TEXT,
  ADD COLUMN IF NOT EXISTS real_name TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS current_team UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS join_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end DATE,
  ADD COLUMN IF NOT EXISTS preferred_game TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.players
SET
  player_tag = COALESCE(player_tag, in_game_name),
  real_name = COALESCE(real_name, in_game_name),
  employee_id = COALESCE(employee_id, id)
WHERE player_tag IS NULL OR real_name IS NULL OR employee_id IS NULL;

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_status_check;
ALTER TABLE public.players
  ADD CONSTRAINT players_status_check
  CHECK (status IN ('active', 'benched', 'bench', 'inactive', 'retired', 'deleted'));

CREATE UNIQUE INDEX IF NOT EXISTS players_player_tag_unique_idx ON public.players(player_tag) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS players_team_idx ON public.players(current_team) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS players_search_idx ON public.players USING gin (
  to_tsvector('simple', COALESCE(player_tag, '') || ' ' || COALESCE(real_name, '') || ' ' || COALESCE(nationality, '') || ' ' || COALESCE(preferred_game, ''))
);

CREATE TABLE IF NOT EXISTS public.player_team_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  transferred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS player_team_history_player_idx ON public.player_team_history(player_id, transferred_at DESC);

-- ── Coaches ─────────────────────────────────────────────────────────────────
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_id_fkey;
ALTER TABLE public.coaches ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coach_tag TEXT,
  ADD COLUMN IF NOT EXISTS real_name TEXT,
  ADD COLUMN IF NOT EXISTS coach_type TEXT NOT NULL DEFAULT 'head_coach',
  ADD COLUMN IF NOT EXISTS current_team UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.coaches
SET
  coach_type = CASE
    WHEN lower(COALESCE(specialization, '')) LIKE '%analyst%' THEN 'analyst'
    WHEN lower(COALESCE(specialization, '')) LIKE '%assistant%' THEN 'assistant_coach'
    ELSE COALESCE(coach_type, 'head_coach')
  END,
  employee_id = COALESCE(employee_id, id),
  real_name = COALESCE(real_name, specialization)
WHERE employee_id IS NULL OR real_name IS NULL;

ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_status_check;
ALTER TABLE public.coaches
  ADD CONSTRAINT coaches_status_check CHECK (status IN ('active', 'inactive', 'archived', 'deleted'));
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_coach_type_check;
ALTER TABLE public.coaches
  ADD CONSTRAINT coaches_coach_type_check CHECK (coach_type IN ('head_coach', 'assistant_coach', 'analyst'));

CREATE TABLE IF NOT EXISTS public.coaching_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  coach_type TEXT NOT NULL CHECK (coach_type IN ('head_coach', 'assistant_coach', 'analyst')),
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coaches_team_idx ON public.coaches(current_team) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS coaching_history_coach_idx ON public.coaching_history(coach_id, started_at DESC);

-- ── Tournaments ─────────────────────────────────────────────────────────────
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS tournament_code TEXT,
  ADD COLUMN IF NOT EXISTS tournament_name TEXT,
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'single_elimination',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS registration_open TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_close TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_teams INTEGER,
  ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

UPDATE public.tournaments
SET
  tournament_name = COALESCE(tournament_name, name),
  tournament_code = COALESCE(tournament_code, 'TRN-' || upper(substring(id::text from 1 for 8)))
WHERE tournament_name IS NULL OR tournament_code IS NULL;

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_status_check
  CHECK (status IN ('draft', 'registration_open', 'published', 'active', 'completed', 'archived', 'cancelled', 'upcoming'));
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_format_check
  CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'group_stage_playoffs'));

CREATE UNIQUE INDEX IF NOT EXISTS tournaments_code_unique_idx ON public.tournaments(tournament_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tournaments_status_idx ON public.tournaments(status, start_date);
CREATE INDEX IF NOT EXISTS tournaments_search_idx ON public.tournaments USING gin (
  to_tsvector('simple', COALESCE(tournament_name, '') || ' ' || COALESCE(game, '') || ' ' || COALESCE(organizer, '') || ' ' || COALESCE(location, ''))
);

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  seed INTEGER,
  group_name TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'withdrawn', 'disqualified')),
  PRIMARY KEY (tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS tournament_teams_team_idx ON public.tournament_teams(team_id);

-- ── Matches ─────────────────────────────────────────────────────────────────
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS round TEXT,
  ADD COLUMN IF NOT EXISTS score_home INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_away INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winner UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mvp UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS timeline JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS referees UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS map_scores JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('scheduled', 'live', 'delayed', 'completed', 'cancelled', 'postponed'));

CREATE INDEX IF NOT EXISTS matches_status_idx ON public.matches(status, scheduled_at);
CREATE INDEX IF NOT EXISTS matches_tournament_status_idx ON public.matches(tournament_id, status);

CREATE TABLE IF NOT EXISTS public.match_player_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  kills INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  is_mvp BOOLEAN NOT NULL DEFAULT false,
  is_win BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

DROP TRIGGER IF EXISTS match_player_statistics_updated_at ON public.match_player_statistics;
CREATE TRIGGER match_player_statistics_updated_at
  BEFORE UPDATE ON public.match_player_statistics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS match_player_stats_player_idx ON public.match_player_statistics(player_id);
CREATE INDEX IF NOT EXISTS match_player_stats_tournament_idx ON public.match_player_statistics(tournament_id);

-- ── Practice sessions ───────────────────────────────────────────────────────
ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendance JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_status_check;
ALTER TABLE public.practice_sessions
  ADD CONSTRAINT practice_sessions_status_check
  CHECK (status IN ('scheduled', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS practice_sessions_coach_idx ON public.practice_sessions(coach_id);
CREATE INDEX IF NOT EXISTS practice_sessions_time_idx ON public.practice_sessions(scheduled_at);

-- ── Standings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_standings (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  maps_won INTEGER NOT NULL DEFAULT 0,
  maps_lost INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS tournament_standings_rank_idx
  ON public.tournament_standings(tournament_id, points DESC, wins DESC, maps_won DESC);

-- ── Team statistics snapshots ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_statistics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  championships INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(8, 3) NOT NULL DEFAULT 0,
  current_streak TEXT NOT NULL DEFAULT 'none',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_statistics_snapshots_team_idx
  ON public.team_statistics_snapshots(team_id, calculated_at DESC);
