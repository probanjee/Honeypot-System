-- =============================================================================
-- Migration 016: Create PostgreSQL functions and triggers
-- =============================================================================

-- ── 1. Employee ID Generator Sequence & Function ───────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_val INT;
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    current_year := to_char(now(), 'YYYY');
    next_val := nextval('public.employee_id_seq');
    NEW.employee_id := 'NWE-' || current_year || '-' || lpad(next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_employee_id ON public.employees;
CREATE TRIGGER trigger_generate_employee_id
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.generate_employee_id();

-- ── 2. Tournament Match Code Generator Function ─────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.match_code_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_match_code()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_val INT;
BEGIN
  IF NEW.match_code IS NULL OR NEW.match_code = '' THEN
    current_year := to_char(now(), 'YYYY');
    next_val := nextval('public.match_code_seq');
    NEW.match_code := 'MCH-' || current_year || '-' || lpad(next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_match_code ON public.matches;
CREATE TRIGGER trigger_generate_match_code
  BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.generate_match_code();

-- ── 3. Notification on Announcement Trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_announcement_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    INSERT INTO public.notifications (
      title,
      content,
      type,
      action_url
    )
    VALUES (
      'New Announcement: ' || NEW.title,
      substring(NEW.content from 1 for 150) || '...',
      'info',
      '/announcements/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_announcement_notification ON public.announcements;
CREATE TRIGGER trigger_announcement_notification
  AFTER INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.create_announcement_notification();

-- ── 4. Full-Text Search Index & Trigger for Employees ──────────────────────
-- Add tsvector column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION public.update_profile_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  job_title_name TEXT := '';
  dept_name TEXT := '';
BEGIN
  -- Fetch names from related tables safely
  IF NEW.job_title_id IS NOT NULL THEN
    SELECT title INTO job_title_name FROM public.job_titles WHERE id = NEW.job_title_id;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO dept_name FROM public.departments WHERE id = NEW.department_id;
  END IF;

  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(job_title_name, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(dept_name, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'D');
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profile_search_vector ON public.profiles;
CREATE TRIGGER trigger_profile_search_vector
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_search_vector();

-- Create GIN index on tsvector column for fast text searches
CREATE INDEX IF NOT EXISTS profiles_search_vector_gin ON public.profiles USING GIN(search_vector);
