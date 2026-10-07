-- =============================================================================
-- Migration 015: Create optimized database views
-- =============================================================================

-- ── 1. employee_directory_view ──────────────────────────────────────────────
CREATE OR REPLACE VIEW public.employee_directory_view AS
SELECT 
  e.id,
  e.employee_id,
  p.email,
  p.first_name,
  p.last_name,
  (p.first_name || ' ' || p.last_name) AS full_name,
  p.avatar_url,
  p.phone,
  p.timezone,
  e.hire_date,
  e.status AS employee_status,
  p.role AS user_role,
  d.name AS department_name,
  d.code AS department_code,
  o.name AS office_name,
  o.city AS office_city,
  jt.title AS job_title,
  jt.grade AS job_grade,
  e.manager_id,
  (m_p.first_name || ' ' || m_p.last_name) AS manager_name
FROM public.employees e
JOIN public.profiles p ON e.id = p.id
LEFT JOIN public.departments d ON p.department_id = d.id
LEFT JOIN public.offices o ON p.office_id = o.id
LEFT JOIN public.job_titles jt ON p.job_title_id = jt.id
LEFT JOIN public.profiles m_p ON e.manager_id = m_p.id
WHERE e.deleted_at IS NULL;

-- ── 2. dashboard_summary_view ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.dashboard_summary_view AS
SELECT
  (SELECT COUNT(*) FROM public.employees WHERE status = 'active' AND deleted_at IS NULL) AS total_active_employees,
  (SELECT COUNT(*) FROM public.matches WHERE scheduled_at >= now() AND deleted_at IS NULL) AS upcoming_matches_count,
  (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress') AND deleted_at IS NULL) AS open_tickets_count,
  (SELECT COUNT(*) FROM public.announcements WHERE deleted_at IS NULL AND status = 'published') AS published_announcements_count;

-- ── 3. upcoming_matches_view ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.upcoming_matches_view AS
SELECT 
  m.id AS match_id,
  m.match_code,
  t.name AS tournament_name,
  t.game AS tournament_game,
  m.scheduled_at,
  m.status AS match_status,
  t_h.name AS home_team_name,
  t_h.code AS home_team_code,
  COALESCE(t_a.name, m.opponent_name) AS away_team_name,
  COALESCE(t_a.code, 'EXT') AS away_team_code
FROM public.matches m
JOIN public.tournaments t ON m.tournament_id = t.id
JOIN public.teams t_h ON m.home_team_id = t_h.id
LEFT JOIN public.teams t_a ON m.away_team_id = t_a.id
WHERE m.scheduled_at >= now() AND m.deleted_at IS NULL
ORDER BY m.scheduled_at ASC;

-- ── 4. department_statistics_view ────────────────────────────────────────────
CREATE OR REPLACE VIEW public.department_statistics_view AS
SELECT
  d.id AS department_id,
  d.name AS department_name,
  d.code AS department_code,
  COUNT(DISTINCT e.id) AS employee_count,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'pending') AS pending_leave_count,
  COUNT(DISTINCT doc.id) FILTER (WHERE doc.deleted_at IS NULL) AS document_count
FROM public.departments d
LEFT JOIN public.profiles p ON p.department_id = d.id
LEFT JOIN public.employees e ON e.id = p.id AND e.deleted_at IS NULL
LEFT JOIN public.leave_requests lr ON lr.emp_id = e.id AND lr.status = 'pending'
LEFT JOIN public.documents doc ON doc.owner_id = p.id AND doc.deleted_at IS NULL
GROUP BY d.id, d.name, d.code;

-- ── 5. unread_notifications_view ────────────────────────────────────────────
CREATE OR REPLACE VIEW public.unread_notifications_view AS
SELECT 
  n.id AS notification_id,
  p.id AS profile_id,
  n.title,
  n.content,
  n.type,
  n.action_url,
  n.created_at
FROM public.notifications n
CROSS JOIN public.profiles p
LEFT JOIN public.notification_reads nr ON nr.notification_id = n.id AND nr.profile_id = p.id
WHERE nr.read_at IS NULL;

-- ── 6. active_players_view ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.active_players_view AS
SELECT 
  pl.id AS player_id,
  p.first_name,
  p.last_name,
  pl.in_game_name,
  pl.role AS player_role,
  pl.status AS player_status,
  t.name AS team_name,
  t.code AS team_code
FROM public.players pl
JOIN public.employees e ON pl.id = e.id
JOIN public.profiles p ON e.id = p.id
LEFT JOIN public.team_members tm ON tm.emp_id = e.id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE e.deleted_at IS NULL AND pl.status = 'active';
