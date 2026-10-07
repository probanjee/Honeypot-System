-- =============================================================================
-- Migration 006: Add office/job_title references to profiles & create employees tables
-- =============================================================================

-- ── Alter Profiles ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES public.job_titles(id) ON DELETE SET NULL;

-- Safe constraint add for department link
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_department' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT fk_profiles_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Create Employees ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id            UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id   TEXT        NOT NULL UNIQUE, -- E.g. NWE-YYYY-XXXX (handled by generator)
  hire_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  manager_id    UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('personal_email', 'work_email', 'personal_phone', 'work_phone', 'discord', 'slack')),
  value       TEXT        NOT NULL,
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_addresses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('home', 'billing', 'mailing')),
  line1       TEXT        NOT NULL,
  line2       TEXT,
  city        TEXT        NOT NULL,
  state       TEXT        NOT NULL,
  postal_code TEXT        NOT NULL,
  country     TEXT        NOT NULL,
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_emergency_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  relationship TEXT       NOT NULL,
  phone       TEXT        NOT NULL,
  email       TEXT,
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('passport', 'contract', 'id_card', 'tax_form', 'resume', 'other')),
  file_url    TEXT        NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS emp_updated_at ON public.employees;
CREATE TRIGGER emp_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS contact_updated_at ON public.employee_contacts;
CREATE TRIGGER contact_updated_at BEFORE UPDATE ON public.employee_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS address_updated_at ON public.employee_addresses;
CREATE TRIGGER address_updated_at BEFORE UPDATE ON public.employee_addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS emergency_updated_at ON public.employee_emergency_contacts;
CREATE TRIGGER emergency_updated_at BEFORE UPDATE ON public.employee_emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS emp_employee_id_idx ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS emp_manager_idx ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS emp_contacts_idx ON public.employee_contacts(emp_id);
CREATE INDEX IF NOT EXISTS emp_addresses_idx ON public.employee_addresses(emp_id);
CREATE INDEX IF NOT EXISTS emp_emergency_idx ON public.employee_emergency_contacts(emp_id);
CREATE INDEX IF NOT EXISTS emp_docs_idx ON public.employee_documents(emp_id);
