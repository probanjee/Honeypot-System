-- =============================================================================
-- Migration 001: Create profiles table
-- Run this in the Supabase SQL editor or via Supabase CLI.
-- Idempotent: safe to run multiple times.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  first_name    TEXT        NOT NULL DEFAULT '',
  last_name     TEXT        NOT NULL DEFAULT '',
  avatar_url    TEXT,
  department_id UUID,
  role          TEXT        NOT NULL DEFAULT 'employee'
                            CHECK (role IN (
                              'employee', 'manager', 'hr', 'tournament_admin',
                              'it_support', 'security_analyst', 'administrator', 'super_admin'
                            )),
  phone         TEXT,
  employee_id   TEXT        UNIQUE,
  designation   TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'suspended')),
  timezone      TEXT        NOT NULL DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for common lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx        ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx         ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_status_idx       ON public.profiles(status);
CREATE INDEX IF NOT EXISTS profiles_department_idx   ON public.profiles(department_id);

COMMENT ON TABLE public.profiles IS 'Extended user profile data linked to Supabase auth.users';
