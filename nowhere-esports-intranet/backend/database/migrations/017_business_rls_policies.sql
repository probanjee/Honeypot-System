-- =============================================================================
-- Migration 017: Enable RLS and create security policies for business tables
-- =============================================================================

-- List of tables to enable RLS on
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'organizations', 'offices', 'departments', 'job_titles',
    'employees', 'employee_contacts', 'employee_addresses', 'employee_documents', 'employee_emergency_contacts',
    'teams', 'team_members', 'team_managers',
    'players', 'coaches', 'tournaments', 'matches', 'match_results', 'schedules', 'practice_sessions',
    'announcements', 'announcement_reads', 'notifications', 'notification_reads',
    'folders', 'documents', 'document_versions', 'document_permissions',
    'leave_types', 'leave_requests', 'holidays', 'attendance',
    'ticket_categories', 'support_tickets', 'ticket_comments', 'ticket_status_history',
    'kb_categories', 'kb_articles', 'kb_article_versions',
    'activity_logs', 'login_history'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END IF;
END $$;

-- ── 1. Read-Only Corporate Data (All Auth Users Read, Admins Manage) ────────
-- Tables: organizations, offices, departments, job_titles, ticket_categories, kb_categories, leave_types, holidays
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['organizations', 'offices', 'departments', 'job_titles', 'ticket_categories', 'kb_categories', 'leave_types', 'holidays'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (auth.role() = ''authenticated'');', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS %I_all_admin ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_all_admin ON public.%I FOR ALL USING (public.get_my_role() IN (''administrator'', ''super_admin''));', t, t);
  END IF;
END $$;

-- ── 2. Knowledge Base Articles (All Read, Author/HR/Admin Manage) ───────────
DROP POLICY IF EXISTS kb_articles_select ON public.kb_articles;
CREATE POLICY kb_articles_select ON public.kb_articles FOR SELECT 
  USING (status = 'published' OR author_id = auth.uid() OR public.get_my_role() IN ('hr', 'administrator', 'super_admin'));

DROP POLICY IF EXISTS kb_articles_all ON public.kb_articles;
CREATE POLICY kb_articles_all ON public.kb_articles FOR ALL
  USING (author_id = auth.uid() OR public.get_my_role() IN ('administrator', 'super_admin'));

-- ── 3. Employees & Contact details (Self, HR, Admin access) ──────────────────
-- Tables: employees, employee_contacts, employee_addresses, employee_emergency_contacts, employee_documents
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['employees', 'employee_contacts', 'employee_addresses', 'employee_emergency_contacts', 'employee_documents'];
  col TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    col := CASE WHEN t = 'employees' THEN 'id' ELSE 'emp_id' END;
    EXECUTE format('DROP POLICY IF EXISTS %I_self_hr ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_self_hr ON public.%I FOR ALL USING (%I = auth.uid() OR public.get_my_role() IN (''hr'', ''administrator'', ''super_admin''));', t, t, col);
  END IF;
END $$;

-- ── 4. Leave Requests (Self view/create, Manager/HR approve) ────────────────
DROP POLICY IF EXISTS leave_req_self ON public.leave_requests;
CREATE POLICY leave_req_self ON public.leave_requests FOR ALL
  USING (emp_id = auth.uid())
  WITH CHECK (emp_id = auth.uid());

DROP POLICY IF EXISTS leave_req_hr_mgr ON public.leave_requests;
CREATE POLICY leave_req_hr_mgr ON public.leave_requests FOR ALL
  USING (
    public.get_my_role() IN ('hr', 'administrator', 'super_admin')
    OR approved_by = auth.uid()
  );

-- ── 5. Support Tickets (Creator view/create, IT Support/Admin manage) ──────
DROP POLICY IF EXISTS tickets_self ON public.support_tickets;
CREATE POLICY tickets_self ON public.support_tickets FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS tickets_it_support ON public.support_tickets;
CREATE POLICY tickets_it_support ON public.support_tickets FOR ALL
  USING (
    public.get_my_role() IN ('it_support', 'administrator', 'super_admin')
    OR assignee_id = auth.uid()
  );

-- ── 6. Esports & Tournaments (All Read, TournamentAdmin/Admin Manage) ────────
-- Tables: tournaments, matches, match_results, schedules, practice_sessions, teams, team_members, team_managers
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['tournaments', 'matches', 'match_results', 'schedules', 'practice_sessions', 'teams', 'team_members', 'team_managers'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (auth.role() = ''authenticated'');', t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_manage ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_manage ON public.%I FOR ALL USING (public.get_my_role() IN (''tournament_admin'', ''administrator'', ''super_admin''));', t, t);
  END IF;
END $$;

-- ── 7. Announcements (All Read, Author/HR/Admin Manage) ──────────────────────
DROP POLICY IF EXISTS announcements_select ON public.announcements;
CREATE POLICY announcements_select ON public.announcements FOR SELECT
  USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS announcements_manage ON public.announcements;
CREATE POLICY announcements_manage ON public.announcements FOR ALL
  USING (author_id = auth.uid() OR public.get_my_role() IN ('hr', 'administrator', 'super_admin'));
