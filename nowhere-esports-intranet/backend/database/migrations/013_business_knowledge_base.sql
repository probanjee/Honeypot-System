-- =============================================================================
-- Migration 013: Create knowledge base tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kb_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  code        TEXT        NOT NULL UNIQUE, -- E.g. KB_IT, KB_HR
  description TEXT,
  parent_id   UUID        REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID        NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  author_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  content       TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  view_count    INTEGER     NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kb_article_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      UUID        NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  version         INTEGER     NOT NULL,
  title           TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  edited_by       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_summary  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS kb_article_updated_at ON public.kb_articles;
CREATE TRIGGER kb_article_updated_at BEFORE UPDATE ON public.kb_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS kb_article_category_idx ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS kb_article_author_idx ON public.kb_articles(author_id);
CREATE INDEX IF NOT EXISTS kb_article_slug_idx ON public.kb_articles(slug);
CREATE INDEX IF NOT EXISTS kb_version_article_idx ON public.kb_article_versions(article_id);
