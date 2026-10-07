-- =============================================================================
-- Migration 018: Recursive Hierarchy Query Postgres Functions (RPC-callable)
-- =============================================================================

-- ── 1. Ascend Reporting Hierarchy (Find all managers of an employee) ────────
CREATE OR REPLACE FUNCTION public.get_manager_hierarchy(emp_id UUID)
RETURNS TABLE (
  id UUID,
  employee_id TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  manager_id UUID,
  depth INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE manager_hierarchy AS (
    -- Anchor member: target employee's manager
    SELECT 
      e.id,
      e.employee_id,
      p.first_name,
      p.last_name,
      p.role,
      e.manager_id,
      1 AS depth
    FROM public.employees e
    JOIN public.profiles p ON e.id = p.id
    WHERE e.id = emp_id
    
    UNION ALL
    
    -- Recursive member: manager's manager
    SELECT 
      e.id,
      e.employee_id,
      p.first_name,
      p.last_name,
      p.role,
      e.manager_id,
      h.depth + 1 AS depth
    FROM public.employees e
    JOIN public.profiles p ON e.id = p.id
    JOIN manager_hierarchy h ON e.id = h.manager_id
  )
  SELECT * FROM manager_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 2. Descend Reporting Hierarchy (Find all reports under a manager) ────────
CREATE OR REPLACE FUNCTION public.get_reports_hierarchy(emp_id UUID)
RETURNS TABLE (
  id UUID,
  employee_id TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  manager_id UUID,
  depth INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE reports_hierarchy AS (
    -- Anchor member: direct reports
    SELECT 
      e.id,
      e.employee_id,
      p.first_name,
      p.last_name,
      p.role,
      e.manager_id,
      1 AS depth
    FROM public.employees e
    JOIN public.profiles p ON e.id = p.id
    WHERE e.manager_id = emp_id
    
    UNION ALL
    
    -- Recursive member: indirect reports
    SELECT 
      e.id,
      e.employee_id,
      p.first_name,
      p.last_name,
      p.role,
      e.manager_id,
      h.depth + 1 AS depth
    FROM public.employees e
    JOIN public.profiles p ON e.id = p.id
    JOIN reports_hierarchy h ON e.manager_id = h.id
  )
  SELECT * FROM reports_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE;
