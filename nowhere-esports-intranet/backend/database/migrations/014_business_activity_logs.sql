-- =============================================================================
-- Migration 014: Create activity logs and login history tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  email          TEXT        NOT NULL,
  status         TEXT        NOT NULL CHECK (status IN ('success', 'failed')),
  ip_address     INET,
  user_agent     TEXT,
  failure_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS activity_profile_idx ON public.activity_logs(profile_id);
CREATE INDEX IF NOT EXISTS activity_created_idx ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS login_profile_idx ON public.login_history(profile_id);
CREATE INDEX IF NOT EXISTS login_created_idx ON public.login_history(created_at DESC);
