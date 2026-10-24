-- =============================================================================
-- Nowhere Esports Intranet — Full PostgreSQL Schema
-- Self-contained initialization for standalone PostgreSQL 15
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Users & Authentication ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'employee',
  first_name    VARCHAR(100) DEFAULT '',
  last_name     VARCHAR(100) DEFAULT '',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. User Profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  first_name    VARCHAR(100) NOT NULL DEFAULT '',
  last_name     VARCHAR(100) NOT NULL DEFAULT '',
  avatar_url    TEXT,
  department_id UUID,
  role          VARCHAR(50) NOT NULL DEFAULT 'employee',
  phone         VARCHAR(50),
  employee_id   VARCHAR(50) UNIQUE,
  designation   VARCHAR(100),
  status        VARCHAR(50) NOT NULL DEFAULT 'active',
  timezone      VARCHAR(50) NOT NULL DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Audit Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  target_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Departments & Organization ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  code        VARCHAR(50),
  description TEXT,
  head_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  country     VARCHAR(100) NOT NULL,
  is_hq       BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. Esports Management (Teams, Players, Matches, Tournaments) ──────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  game        VARCHAR(100) NOT NULL,
  division    VARCHAR(100) DEFAULT 'Main',
  captain_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  status      VARCHAR(50) DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.players (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  gamertag    VARCHAR(100) NOT NULL,
  real_name   VARCHAR(255),
  role        VARCHAR(50),
  status      VARCHAR(50) DEFAULT 'active',
  stats       JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  game        VARCHAR(100) NOT NULL,
  prize_pool  NUMERIC(12, 2) DEFAULT 0,
  start_date  TIMESTAMPTZ,
  end_date    TIMESTAMPTZ,
  status      VARCHAR(50) DEFAULT 'upcoming',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.matches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_a_id     UUID        REFERENCES public.teams(id) ON DELETE SET NULL,
  team_b_id     UUID        REFERENCES public.teams(id) ON DELETE SET NULL,
  team_a_score  INT         DEFAULT 0,
  team_b_score  INT         DEFAULT 0,
  status        VARCHAR(50) DEFAULT 'scheduled',
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Announcements & Communications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  content     TEXT        NOT NULL,
  category    VARCHAR(100) DEFAULT 'general',
  priority    VARCHAR(50) DEFAULT 'normal',
  author_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  pinned      BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT        NOT NULL,
  type        VARCHAR(50) DEFAULT 'info',
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Deception & Honeypot Attack Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attacks (
  id          SERIAL      PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_ip   VARCHAR(64) NOT NULL,
  source_port INT         DEFAULT 0,
  protocol    VARCHAR(20) DEFAULT 'HTTP',
  attack_type VARCHAR(100) NOT NULL,
  payload     TEXT,
  severity    INT         DEFAULT 0,
  geo_country VARCHAR(100),
  geo_city    VARCHAR(100),
  latitude    FLOAT       DEFAULT 0.0,
  longitude   FLOAT       DEFAULT 0.0,
  headers     JSONB,
  signatures  JSONB,
  blocked     BOOLEAN     DEFAULT FALSE
);

-- ── 8. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_attacks_timestamp ON public.attacks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_severity ON public.attacks(severity DESC);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON public.matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
