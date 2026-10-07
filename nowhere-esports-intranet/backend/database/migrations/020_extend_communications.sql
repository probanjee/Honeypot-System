-- =============================================================================
-- Migration 020: Extend communication modules (announcements & notifications)
-- =============================================================================

-- ── 1. Extend Profiles ───────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday DATE;

-- ── 2. Extend Announcements ──────────────────────────────────────────────────
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'company' CHECK (visibility IN ('company', 'department', 'office', 'role', 'team', 'employees'));
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS visibility_target JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expire_at TIMESTAMPTZ;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ── 3. Extend Announcement Reads ─────────────────────────────────────────────
ALTER TABLE public.announcement_reads ADD COLUMN IF NOT EXISTS opened BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.announcement_reads ADD COLUMN IF NOT EXISTS dismissed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.announcement_reads ADD COLUMN IF NOT EXISTS read_time INTEGER NOT NULL DEFAULT 0; -- in seconds
ALTER TABLE public.announcement_reads ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.announcement_reads ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 4. Extend Notifications ──────────────────────────────────────────────────
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Safe check constraint mapping for type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'danger', 'critical', 'reminder', 'approval', 'system', 'security'));

-- ── 5. Indexing for High Performance ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS announcement_visibility_idx ON public.announcements(visibility);
CREATE INDEX IF NOT EXISTS announcement_expire_idx ON public.announcements(expire_at) WHERE expire_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS notif_recipient_idx ON public.notifications(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notif_read_idx ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS profiles_birthday_idx ON public.profiles(birthday) WHERE birthday IS NOT NULL;
