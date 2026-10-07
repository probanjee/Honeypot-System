-- =============================================================================
-- Migration 003: Row Level Security policies
-- Must be run AFTER migrations 001 and 002.
-- =============================================================================

-- ── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ── Helper: get caller's role from their profile ────────────────────────────
-- Used inside RLS policies to avoid N+1 policy checks.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- profiles policies
-- =============================================================================

-- Drop existing policies to make this idempotent
DROP POLICY IF EXISTS "profiles_select_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_manager"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_hr"           ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"        ON public.profiles;

-- SELECT: users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- SELECT: managers can view profiles in the same department
CREATE POLICY "profiles_select_manager"
  ON public.profiles FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND department_id = (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- SELECT: HR can view all active/suspended profiles
CREATE POLICY "profiles_select_hr"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'hr');

-- SELECT: Admins and SuperAdmins have full read access
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() IN ('administrator', 'super_admin'));

-- UPDATE: users can update their own non-sensitive fields
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-role-escalation: role must stay unchanged unless admin
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- UPDATE: admins can update any profile
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() IN ('administrator', 'super_admin'));

-- INSERT: only service role (backend) inserts profiles via trigger
-- (RLS bypassed by service role key)
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_my_role() IN ('administrator', 'super_admin'));

-- DELETE: only super_admin can physically delete (soft deletes are UPDATEs)
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (public.get_my_role() = 'super_admin');

-- =============================================================================
-- audit_events policies
-- =============================================================================

DROP POLICY IF EXISTS "audit_select_own"    ON public.audit_events;
DROP POLICY IF EXISTS "audit_select_admin"  ON public.audit_events;
DROP POLICY IF EXISTS "audit_insert_all"    ON public.audit_events;

-- Users can only view their own audit trail
CREATE POLICY "audit_select_own"
  ON public.audit_events FOR SELECT
  USING (actor_id = auth.uid() OR target_id = auth.uid());

-- Admins can view all audit events
CREATE POLICY "audit_select_admin"
  ON public.audit_events FOR SELECT
  USING (public.get_my_role() IN ('administrator', 'super_admin', 'security_analyst'));

-- Backend can insert audit events (service role bypasses RLS anyway)
CREATE POLICY "audit_insert_all"
  ON public.audit_events FOR INSERT
  WITH CHECK (true);
