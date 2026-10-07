-- =============================================================================
-- Migration 011: Create HR, leave and attendance tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.leave_types (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE, -- E.g. Annual Leave, Sick Leave
  code          TEXT        NOT NULL UNIQUE, -- E.g. AL, SL, PL (Parental Leave)
  days_allowed  INTEGER     NOT NULL DEFAULT 20,
  is_paid       BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id        UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID        NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  total_days    NUMERIC(4,1) NOT NULL, -- Supports half-day increments
  reason        TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by   UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  comments      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  date        DATE        NOT NULL UNIQUE,
  is_regional BOOLEAN     NOT NULL DEFAULT false,
  regions     TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out   TIMESTAMPTZ,
  status      TEXT        NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(emp_id, date)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS leave_type_updated_at ON public.leave_types;
CREATE TRIGGER leave_type_updated_at BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS leave_req_updated_at ON public.leave_requests;
CREATE TRIGGER leave_req_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS attendance_updated_at ON public.attendance;
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS leave_req_emp_idx ON public.leave_requests(emp_id);
CREATE INDEX IF NOT EXISTS leave_req_dates_idx ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS holiday_date_idx ON public.holidays(date);
CREATE INDEX IF NOT EXISTS attendance_emp_date_idx ON public.attendance(emp_id, date);
