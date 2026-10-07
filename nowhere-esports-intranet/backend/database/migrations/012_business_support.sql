-- =============================================================================
-- Migration 012: Create IT and support ticketing tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE, -- E.g. Hardware Support, HR Benefits
  code        TEXT        NOT NULL UNIQUE, -- E.g. IT_HW, HR_BEN
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID        NOT NULL REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
  creator_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  priority      TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status        TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  changed_by      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_status TEXT        CHECK (previous_status IN ('open', 'in_progress', 'resolved', 'closed')),
  new_status      TEXT        NOT NULL CHECK (new_status IN ('open', 'in_progress', 'resolved', 'closed')),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS ticket_updated_at ON public.support_tickets;
CREATE TRIGGER ticket_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ticket_comment_updated_at ON public.ticket_comments;
CREATE TRIGGER ticket_comment_updated_at BEFORE UPDATE ON public.ticket_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS ticket_creator_idx ON public.support_tickets(creator_id);
CREATE INDEX IF NOT EXISTS ticket_assignee_idx ON public.support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS ticket_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS ticket_comment_ticket_idx ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_history_ticket_idx ON public.ticket_status_history(ticket_id);
