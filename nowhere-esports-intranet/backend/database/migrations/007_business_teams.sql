-- =============================================================================
-- Migration 007: Create team management tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  code        TEXT        NOT NULL UNIQUE, -- E.g. VAL, LOL, HR, IT
  type        TEXT        NOT NULL DEFAULT 'esports' CHECK (type IN ('esports', 'corporate', 'other')),
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many join table for members
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member', -- E.g. player, coach, analyst, designer
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, emp_id)
);

-- Many-to-many join table for managers
CREATE TABLE IF NOT EXISTS public.team_managers (
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, emp_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS team_updated_at ON public.teams;
CREATE TRIGGER team_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS team_members_emp_idx ON public.team_members(emp_id);
CREATE INDEX IF NOT EXISTS team_managers_emp_idx ON public.team_managers(emp_id);
