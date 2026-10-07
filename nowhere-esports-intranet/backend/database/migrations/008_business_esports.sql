-- =============================================================================
-- Migration 008: Create esports activity tracking tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.players (
  id            UUID        PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  in_game_name  TEXT        NOT NULL UNIQUE,
  role          TEXT        NOT NULL CHECK (role IN ('IGL', 'Duelist', 'Initiator', 'Controller', 'Sentinel', 'Top', 'Jungle', 'Mid', 'ADC', 'Support', 'Flex')),
  mouse_sensitivity TEXT,
  dpi           INTEGER,
  keyboard      TEXT,
  mouse         TEXT,
  monitor       TEXT,
  headset       TEXT,
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'bench', 'inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaches (
  id            UUID        PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  specialization TEXT       NOT NULL, -- E.g. Strategic, Head Coach, Assistant Coach
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  game        TEXT        NOT NULL, -- E.g. Valorant, League of Legends
  organizer   TEXT        NOT NULL,
  prize_pool  TEXT,
  start_date  DATE        NOT NULL,
  end_date    DATE,
  status      TEXT        NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  home_team_id  UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id  UUID        REFERENCES public.teams(id) ON DELETE SET NULL, -- Null if external opponent
  opponent_name TEXT, -- E.g. Fnatic, Sentinels (populated if away_team_id is null)
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'postponed', 'cancelled')),
  match_code    TEXT        NOT NULL UNIQUE, -- Unique match code: e.g. MCH-2026-XXXX
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.match_results (
  match_id        UUID        PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  winner_team_id  UUID, -- References public.teams(id) if internal winner, null if external opponent won
  opponent_won    BOOLEAN     NOT NULL DEFAULT false,
  score_home      INTEGER     NOT NULL DEFAULT 0,
  score_away      INTEGER     NOT NULL DEFAULT 0,
  mvp_player_id   UUID        REFERENCES public.players(id) ON DELETE SET NULL,
  vod_url         TEXT,
  stats_summary   JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schedules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL CHECK (type IN ('match', 'practice', 'scrim', 'media', 'meeting', 'other')),
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  location    TEXT        NOT NULL DEFAULT 'Online', -- E.g. Room A, Online
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER     NOT NULL DEFAULT 120,
  focus_area        TEXT        NOT NULL, -- E.g. VOD review, aim training, strat execution
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS player_updated_at ON public.players;
CREATE TRIGGER player_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_updated_at ON public.coaches;
CREATE TRIGGER coach_updated_at BEFORE UPDATE ON public.coaches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tournament_updated_at ON public.tournaments;
CREATE TRIGGER tournament_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS match_updated_at ON public.matches;
CREATE TRIGGER match_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS result_updated_at ON public.match_results;
CREATE TRIGGER result_updated_at BEFORE UPDATE ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS schedule_updated_at ON public.schedules;
CREATE TRIGGER schedule_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS practice_updated_at ON public.practice_sessions;
CREATE TRIGGER practice_updated_at BEFORE UPDATE ON public.practice_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS match_tournament_idx ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS match_home_idx ON public.matches(home_team_id);
CREATE INDEX IF NOT EXISTS match_away_idx ON public.matches(away_team_id);
CREATE INDEX IF NOT EXISTS match_scheduled_idx ON public.matches(scheduled_at);
CREATE INDEX IF NOT EXISTS schedule_time_idx ON public.schedules(start_time, end_time);
CREATE INDEX IF NOT EXISTS practice_team_idx ON public.practice_sessions(team_id);
