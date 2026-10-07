-- =============================================================================
-- Migration 005: Create business organization tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  domain      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  city        TEXT        NOT NULL,
  country     TEXT        NOT NULL,
  timezone    TEXT        NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL UNIQUE,
  code        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_titles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_id     UUID        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  grade       TEXT        NOT NULL, -- Grade level: e.g. E1, E2, M1, D1
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dept_id, title)
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS org_updated_at ON public.organizations;
CREATE TRIGGER org_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS office_updated_at ON public.offices;
CREATE TRIGGER office_updated_at BEFORE UPDATE ON public.offices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS dept_updated_at ON public.departments;
CREATE TRIGGER dept_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS job_title_updated_at ON public.job_titles;
CREATE TRIGGER job_title_updated_at BEFORE UPDATE ON public.job_titles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS dept_org_idx ON public.departments(org_id);
CREATE INDEX IF NOT EXISTS job_title_dept_idx ON public.job_titles(dept_id);
