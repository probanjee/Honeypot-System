-- =============================================================================
-- Migration 010: Create document management tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  parent_id   UUID        REFERENCES public.folders(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, name)
);

CREATE TABLE IF NOT EXISTS public.documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  folder_id       UUID        REFERENCES public.folders(id) ON DELETE CASCADE,
  owner_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_type       TEXT        NOT NULL, -- PDF, DOCX, XLSX, PNG etc.
  size_bytes      BIGINT      NOT NULL DEFAULT 0,
  current_version INTEGER     NOT NULL DEFAULT 1,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version         INTEGER     NOT NULL,
  file_url        TEXT        NOT NULL,
  uploaded_by     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  size_bytes      BIGINT      NOT NULL DEFAULT 0,
  change_summary  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_permissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  role            TEXT        CHECK (role IN (
                                'employee', 'manager', 'hr', 'tournament_admin',
                                'it_support', 'security_analyst', 'administrator', 'super_admin'
                              )),
  dept_id         UUID        REFERENCES public.departments(id) ON DELETE CASCADE,
  profile_id      UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_level    TEXT        NOT NULL CHECK (access_level IN ('read', 'write', 'admin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS folder_updated_at ON public.folders;
CREATE TRIGGER folder_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS document_updated_at ON public.documents;
CREATE TRIGGER document_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS doc_permission_updated_at ON public.document_permissions;
CREATE TRIGGER doc_permission_updated_at BEFORE UPDATE ON public.document_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS folder_parent_idx ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS document_folder_idx ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS doc_owner_idx ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS doc_version_doc_idx ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS doc_perm_doc_idx ON public.document_permissions(document_id);
