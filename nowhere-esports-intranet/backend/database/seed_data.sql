-- =============================================================================
-- Database Seed Data — Nowhere Esports Intranet
-- Purges and re-seeds realistic business data.
-- =============================================================================

-- Enable uuid extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  org_id UUID;
  la_office_id UUID;
  ldn_office_id UUID;
  sel_office_id UUID;
  
  -- Departments
  dept_ops UUID; dept_hr UUID; dept_fin UUID; dept_prod UUID;
  dept_it UUID; dept_leg UUID; dept_sec UUID; dept_fac UUID;
  
  -- Leave Types
  lt_annual UUID; lt_sick UUID; lt_parental UUID; lt_unpaid UUID;
  
  -- Ticket Categories
  tc_hw UUID; tc_sw UUID; tc_net UUID; tc_ben UUID; tc_fac UUID;
  
  -- KB Categories
  kbc_it UUID; kbc_hr UUID; kbc_esports UUID; kbc_gen UUID;

  -- Temporary variables for employee generation
  temp_user_id UUID;
  first_names TEXT[] := ARRAY['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Robin', 'Riley', 'Sam', 'Chris', 'Pat', 'Terry', 'Kim', 'Leslie', 'Dana', 'Kelly', 'Shannon', 'Tracy', 'Jody', 'Ashley', 'David', 'John', 'James', 'Robert', 'Michael', 'William', 'Richard', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Emily', 'Sarah', 'Jessica', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Sandra', 'Ashley', 'Dorothy'];
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres'];
  
  i INT;
  manager_id UUID := NULL;
  selected_dept UUID;
  selected_office UUID;
  selected_role TEXT;
  selected_status TEXT;
  email_str TEXT;
  fname TEXT;
  lname TEXT;
  
  -- Team IDs
  t_val1 UUID; t_val2 UUID; t_lol1 UUID; t_lol2 UUID; t_cs1 UUID; t_cs2 UUID;
  t_apex1 UUID; t_apex2 UUID; t_rl1 UUID; t_rl2 UUID;
  
  -- Player and Coach IDs
  p_ids UUID[] := '{}';
  
  -- Tournament IDs
  tourney_ids UUID[] := '{}';
  match_id UUID;
BEGIN
  -- ── 1. Clear Existing Data ────────────────────────────────────────────────
  TRUNCATE public.login_history, public.activity_logs, public.ticket_status_history, 
           public.ticket_comments, public.support_tickets, public.ticket_categories,
           public.kb_article_versions, public.kb_articles, public.kb_categories,
           public.attendance, public.leave_requests, public.leave_types, public.holidays,
           public.document_permissions, public.document_versions, public.documents, public.folders,
           public.notification_reads, public.notifications, public.announcement_reads, public.announcements,
           public.practice_sessions, public.schedules, public.match_results, public.matches, public.tournaments,
           public.coaches, public.players, public.team_managers, public.team_members, public.teams,
           public.employee_documents, public.employee_emergency_contacts, public.employee_addresses, 
           public.employee_contacts, public.employees CASCADE;

  -- Also delete created profiles (linked to auth.users)
  DELETE FROM public.profiles;

  -- ── 2. Insert Core Organization & Offices ─────────────────────────────────
  INSERT INTO public.organizations (name, domain) 
  VALUES ('Nowhere Esports', 'nowhere.gg') 
  RETURNING id INTO org_id;

  INSERT INTO public.offices (name, city, country, timezone) 
  VALUES ('LA Esports Arena & HQ', 'Los Angeles', 'USA', 'America/Los_Angeles') 
  RETURNING id INTO la_office_id;

  INSERT INTO public.offices (name, city, country, timezone) 
  VALUES ('London Operations Center', 'London', 'UK', 'Europe/London') 
  RETURNING id INTO ldn_office_id;

  INSERT INTO public.offices (name, city, country, timezone) 
  VALUES ('Seoul Training Facility', 'Seoul', 'South Korea', 'Asia/Seoul') 
  RETURNING id INTO sel_office_id;

  -- ── 3. Insert Departments ─────────────────────────────────────────────────
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Esports Operations', 'ESP_OPS') RETURNING id INTO dept_ops;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Human Resources', 'HR') RETURNING id INTO dept_hr;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Finance', 'FIN') RETURNING id INTO dept_fin;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Production & Media', 'PROD') RETURNING id INTO dept_prod;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'IT Support', 'IT') RETURNING id INTO dept_it;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Legal & Compliance', 'LEG') RETURNING id INTO dept_leg;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Information Security', 'SEC') RETURNING id INTO dept_sec;
  INSERT INTO public.departments (org_id, name, code) VALUES (org_id, 'Facilities', 'FAC') RETURNING id INTO dept_fac;

  -- ── 4. Insert Job Titles ──────────────────────────────────────────────────
  INSERT INTO public.job_titles (dept_id, title, grade) VALUES (dept_ops, 'VP of Esports', 'D1');
  INSERT INTO public.job_titles (dept_ops, 'General Manager', 'M2');
  INSERT INTO public.job_titles (dept_ops, 'Head Coach', 'E3');
  INSERT INTO public.job_titles (dept_ops, 'Professional Player', 'E2');
  INSERT INTO public.job_titles (dept_hr, 'HR Director', 'M3');
  INSERT INTO public.job_titles (dept_hr, 'HR Specialist', 'E2');
  INSERT INTO public.job_titles (dept_fin, 'Chief Financial Officer', 'D1');
  INSERT INTO public.job_titles (dept_fin, 'Senior Accountant', 'E3');
  INSERT INTO public.job_titles (dept_prod, 'Broadcast Director', 'M2');
  INSERT INTO public.job_titles (dept_prod, 'Video Editor', 'E2');
  INSERT INTO public.job_titles (dept_it, 'IT Support Manager', 'M1');
  INSERT INTO public.job_titles (dept_it, 'Helpdesk Technician', 'E1');
  INSERT INTO public.job_titles (dept_sec, 'Lead Security Analyst', 'E3');
  INSERT INTO public.job_titles (dept_sec, 'Security Analyst', 'E2');

  -- ── 5. Insert Leave Types ─────────────────────────────────────────────────
  INSERT INTO public.leave_types (name, code, days_allowed, is_paid) VALUES ('Annual Leave', 'AL', 25, true) RETURNING id INTO lt_annual;
  INSERT INTO public.leave_types (name, code, days_allowed, is_paid) VALUES ('Sick Leave', 'SL', 10, true) RETURNING id INTO lt_sick;
  INSERT INTO public.leave_types (name, code, days_allowed, is_paid) VALUES ('Parental Leave', 'PL', 60, true) RETURNING id INTO lt_parental;
  INSERT INTO public.leave_types (name, code, days_allowed, is_paid) VALUES ('Unpaid Leave', 'UL', 30, false) RETURNING id INTO lt_unpaid;

  -- ── 6. Insert Ticket Categories ───────────────────────────────────────────
  INSERT INTO public.ticket_categories (name, code) VALUES ('Hardware Support', 'IT_HW') RETURNING id INTO tc_hw;
  INSERT INTO public.ticket_categories (name, code) VALUES ('Software Request', 'IT_SW') RETURNING id INTO tc_sw;
  INSERT INTO public.ticket_categories (name, code) VALUES ('Network Issue', 'IT_NET') RETURNING id INTO tc_net;
  INSERT INTO public.ticket_categories (name, code) VALUES ('HR Benefits Inquiry', 'HR_BEN') RETURNING id INTO tc_ben;
  INSERT INTO public.ticket_categories (name, code) VALUES ('Facilities Request', 'FAC_REQ') RETURNING id INTO tc_fac;

  -- ── 7. Insert KB Categories ───────────────────────────────────────────────
  INSERT INTO public.kb_categories (name, code, description) VALUES ('IT support guides', 'KB_IT', 'Guides for laptops, VPN, printers') RETURNING id INTO kbc_it;
  INSERT INTO public.kb_categories (name, code, description) VALUES ('HR Policies', 'KB_HR', 'Leave rules, benefits policies') RETURNING id INTO kbc_hr;
  INSERT INTO public.kb_categories (name, code, description) VALUES ('Esports Operational Rules', 'KB_ESP', 'Scrim rules, media days guidelines') RETURNING id INTO kbc_esports;
  INSERT INTO public.kb_categories (name, code, description) VALUES ('General Office Info', 'KB_GEN', 'Seoul, London, LA office maps') RETURNING id INTO kbc_gen;

  -- ── 8. Generate 300 Employees via PL/pgSQL Loop ───────────────────────────
  FOR i IN 1..300 LOOP
    -- Select random names
    fname := first_names[1 + mod(i * 31, array_length(first_names, 1))];
    lname := last_names[1 + mod(i * 17, array_length(last_names, 1))];
    email_str := lower(fname) || '.' || lower(lname) || i || '@nowhere.gg';
    
    -- Distribute offices and departments
    selected_office := CASE mod(i, 3) 
                         WHEN 0 THEN la_office_id 
                         WHEN 1 THEN ldn_office_id 
                         ELSE sel_office_id 
                       END;

    selected_dept := CASE mod(i, 8)
                       WHEN 0 THEN dept_ops
                       WHEN 1 THEN dept_hr
                       WHEN 2 THEN dept_fin
                       WHEN 3 THEN dept_prod
                       WHEN 4 THEN dept_it
                       WHEN 5 THEN dept_leg
                       WHEN 6 THEN dept_sec
                       ELSE dept_fac
                     END;

    -- Allocate roles (role tiers)
    selected_role := CASE 
                       WHEN i = 1 THEN 'super_admin'
                       WHEN i BETWEEN 2 AND 5 THEN 'administrator'
                       WHEN i BETWEEN 6 AND 15 THEN 'manager'
                       WHEN i BETWEEN 16 AND 25 THEN 'hr'
                       WHEN i BETWEEN 26 AND 35 THEN 'it_support'
                       WHEN i BETWEEN 36 AND 40 THEN 'security_analyst'
                       WHEN i BETWEEN 41 AND 50 THEN 'tournament_admin'
                       ELSE 'employee'
                     END;

    -- Custom UUID for each user
    temp_user_id := uuid_generate_v4();

    -- Create profile record (by-passing trigger duplicate errors if any)
    INSERT INTO public.profiles (id, email, first_name, last_name, role, status, timezone, office_id, department_id)
    VALUES (temp_user_id, email_str, fname, lname, selected_role::text, 'active', 'UTC', selected_office, selected_dept);

    -- Create matching employee record
    INSERT INTO public.employees (id, employee_id, hire_date, status)
    VALUES (
      temp_user_id,
      'NWE-2026-' || lpad(i::text, 4, '0'),
      CURRENT_DATE - (i * 3 || ' days')::INTERVAL,
      'active'
    );

    -- Keep track of players
    IF i BETWEEN 51 AND 110 THEN
      p_ids := array_append(p_ids, temp_user_id);
    END IF;

    -- Assign manager IDs
    IF mod(i, 30) = 0 THEN
      manager_id := temp_user_id; -- Update manager anchor
    ELSIF manager_id IS NOT NULL THEN
      UPDATE public.employees SET manager_id = manager_id WHERE id = temp_user_id;
    END IF;
  END LOOP;

  -- ── 9. Insert Teams & Assign Players ──────────────────────────────────────
  INSERT INTO public.teams (name, code, type, status) VALUES ('VALORANT First Team', 'VAL1', 'esports', 'active') RETURNING id INTO t_val1;
  INSERT INTO public.teams (name, code, type, status) VALUES ('VALORANT Academy', 'VAL2', 'esports', 'active') RETURNING id INTO t_val2;
  INSERT INTO public.teams (name, code, type, status) VALUES ('League of Legends Pro', 'LOL1', 'esports', 'active') RETURNING id INTO t_lol1;
  INSERT INTO public.teams (name, code, type, status) VALUES ('League of Legends Challengers', 'LOL2', 'esports', 'active') RETURNING id INTO t_lol2;
  INSERT INTO public.teams (name, code, type, status) VALUES ('Counter-Strike Elite', 'CS1', 'esports', 'active') RETURNING id INTO t_cs1;
  INSERT INTO public.teams (name, code, type, status) VALUES ('Counter-Strike Prospects', 'CS2', 'esports', 'active') RETURNING id INTO t_cs2;
  INSERT INTO public.teams (name, code, type, status) VALUES ('Apex Legends Squad A', 'APX1', 'esports', 'active') RETURNING id INTO t_apex1;
  INSERT INTO public.teams (name, code, type, status) VALUES ('Apex Legends Squad B', 'APX2', 'esports', 'active') RETURNING id INTO t_apex2;
  INSERT INTO public.teams (name, code, type, status) VALUES ('Rocket League Squad A', 'RL1', 'esports', 'active') RETURNING id INTO t_rl1;
  INSERT INTO public.teams (name, code, type, status) VALUES ('Rocket League Squad B', 'RL2', 'esports', 'active') RETURNING id INTO t_rl2;

  -- Populate players details & link to teams
  FOR i IN 1..60 LOOP
    INSERT INTO public.players (id, in_game_name, role, status)
    VALUES (
      p_ids[i],
      'player_' || i,
      CASE mod(i, 5)
        WHEN 0 THEN 'Duelist'
        WHEN 1 THEN 'IGL'
        WHEN 2 THEN 'Sentinel'
        WHEN 3 THEN 'Controller'
        ELSE 'Initiator'
      END,
      'active'
    );

    -- Insert into team_members
    INSERT INTO public.team_members (team_id, emp_id, role)
    VALUES (
      CASE 
        WHEN i BETWEEN 1 AND 6   THEN t_val1
        WHEN i BETWEEN 7 AND 12  THEN t_val2
        WHEN i BETWEEN 13 AND 18 THEN t_lol1
        WHEN i BETWEEN 19 AND 24 THEN t_lol2
        WHEN i BETWEEN 25 AND 30 THEN t_cs1
        WHEN i BETWEEN 31 AND 36 THEN t_cs2
        WHEN i BETWEEN 37 AND 42 THEN t_apex1
        WHEN i BETWEEN 43 AND 48 THEN t_apex2
        WHEN i BETWEEN 49 AND 54 THEN t_rl1
        ELSE t_rl2
      END,
      p_ids[i],
      'player'
    );
  END LOOP;

  -- Assign Coaches
  FOR i IN 1..5 LOOP
    -- Assign coaches from employee list (index 120-124)
    temp_user_id := p_ids[1] + (60 + i || ' days')::INTERVAL; -- Safe offset
    -- Resolve valid ID
    SELECT id INTO temp_user_id FROM public.employees ORDER BY id LIMIT 1 OFFSET 120 + i;
    
    INSERT INTO public.coaches (id, specialization, status)
    VALUES (temp_user_id, 'Head Coach', 'active');

    INSERT INTO public.team_members (team_id, emp_id, role)
    VALUES (
      CASE i
        WHEN 1 THEN t_val1
        WHEN 2 THEN t_lol1
        WHEN 3 THEN t_cs1
        WHEN 4 THEN t_apex1
        ELSE t_rl1
      END,
      temp_user_id,
      'coach'
    );
  END LOOP;

  -- ── 10. Insert Tournaments & Matches ──────────────────────────────────────
  FOR i IN 1..12 LOOP
    INSERT INTO public.tournaments (name, game, organizer, prize_pool, start_date, status)
    VALUES (
      'VCT Major League ' || i,
      'Valorant',
      'Riot Games',
      '$1,000,000',
      CURRENT_DATE + (i * 10 || ' days')::INTERVAL,
      'upcoming'
    ) RETURNING id INTO temp_user_id;

    tourney_ids := array_append(tourney_ids, temp_user_id);
    
    -- Insert a scheduled match for each tournament
    INSERT INTO public.matches (tournament_id, home_team_id, opponent_name, scheduled_at, status, match_code)
    VALUES (
      temp_user_id,
      t_val1,
      'Sentinels esports',
      now() + (i * 10 || ' days')::INTERVAL,
      'scheduled',
      'MCH-2026-' || lpad((i * 10)::text, 4, '0')
    ) RETURNING id INTO match_id;
  END LOOP;

  -- ── 11. Insert 100 Announcements ──────────────────────────────────────────
  -- Fetch an admin profile to act as author
  SELECT id INTO temp_user_id FROM public.profiles WHERE role = 'administrator' LIMIT 1;
  
  FOR i IN 1..100 LOOP
    INSERT INTO public.announcements (author_id, title, content, status, published_at)
    VALUES (
      temp_user_id,
      'Corporate Update Announcement #' || i,
      'This is the body content of Nowhere Esports Corporate Update #' || i || '. Stay tuned for more details regarding upcoming training camps and facilities operations.',
      'published',
      now() - (i || ' hours')::INTERVAL
    );
  END LOOP;

  -- ── 12. Insert 200 Support Tickets ────────────────────────────────────────
  -- Fetch employee profile to act as creator
  SELECT id INTO temp_user_id FROM public.profiles WHERE role = 'employee' LIMIT 1;
  
  FOR i IN 1..200 LOOP
    INSERT INTO public.support_tickets (category_id, creator_id, title, description, priority, status)
    VALUES (
      CASE mod(i, 5)
        WHEN 0 THEN tc_hw
        WHEN 1 THEN tc_sw
        WHEN 2 THEN tc_net
        WHEN 3 THEN tc_ben
        ELSE tc_fac
      END,
      temp_user_id,
      'Helpdesk Support Ticket #' || i,
      'Description of the issue for support ticket #' || i || '. Problem reporting with equipment, access credentials, or corporate facilities.',
      CASE mod(i, 4)
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        WHEN 2 THEN 'high'
        ELSE 'urgent'
      END,
      CASE mod(i, 3)
        WHEN 0 THEN 'open'
        WHEN 1 THEN 'in_progress'
        ELSE 'resolved'
      END
    );
  END LOOP;

  -- ── 13. Insert 100 KB Articles ────────────────────────────────────────────
  FOR i IN 1..100 LOOP
    INSERT INTO public.kb_articles (category_id, author_id, title, slug, content, status)
    VALUES (
      CASE mod(i, 4)
        WHEN 0 THEN kbc_it
        WHEN 1 THEN kbc_hr
        WHEN 2 THEN kbc_esports
        ELSE kbc_gen
      END,
      temp_user_id,
      'Intranet Help Guide Title #' || i,
      'intranet-help-guide-slug-' || i,
      'This is the core content body for help center article #' || i || '. In this guide, you will learn how to configure your settings, navigate teams, and report match history.',
      'published'
    );
  END LOOP;
END $$;
