-- =============================================================================
-- Migration 002: Create audit_events table
-- Immutable event log — rows are never updated or deleted.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent any UPDATE or DELETE on audit_events (immutable log)
CREATE OR REPLACE RULE audit_events_no_update AS
  ON UPDATE TO public.audit_events DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_events_no_delete AS
  ON DELETE TO public.audit_events DO INSTEAD NOTHING;

-- Indexes for querying audit trail
CREATE INDEX IF NOT EXISTS audit_events_actor_idx    ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS audit_events_target_idx   ON public.audit_events(target_id);
CREATE INDEX IF NOT EXISTS audit_events_action_idx   ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS audit_events_created_idx  ON public.audit_events(created_at DESC);

COMMENT ON TABLE public.audit_events IS 'Immutable audit log of all security-relevant actions';
