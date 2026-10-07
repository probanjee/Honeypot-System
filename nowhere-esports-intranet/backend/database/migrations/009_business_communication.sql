-- =============================================================================
-- Migration 009: Create communication tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  pinned      BOOLEAN     NOT NULL DEFAULT false,
  status      TEXT        NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracking reads for announcements
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id UUID        NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  profile_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'danger')),
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many join table for notification read states
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id UUID        NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  profile_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, profile_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS announcement_updated_at ON public.announcements;
CREATE TRIGGER announcement_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS announcement_author_idx ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS announcement_published_idx ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS notification_created_idx ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notif_reads_profile_idx ON public.notification_reads(profile_id);
