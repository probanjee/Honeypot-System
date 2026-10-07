import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export interface SearchDirectoryQuery {
  q?: string; // keyword search (matches name, email, employee ID, job title)
  department?: string; // department ID or code
  office?: string; // office ID or name
  role?: string; // user role
  status?: string; // employee status
  manager_id?: string;
  sortBy?: string; // full_name, email, hire_date, employee_id
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class DirectoryService {
  async search(query: SearchDirectoryQuery): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const {
      q,
      department,
      office,
      role,
      status,
      manager_id,
      sortBy = 'full_name',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = query;

    let dbQuery = supabaseAdmin
      .from('employee_directory_view')
      .select('*', { count: 'exact' });

    // ── 1. Filters ──────────────────────────────────────────────────────────
    if (status) {
      dbQuery = dbQuery.eq('employee_status', status);
    }
    if (role) {
      dbQuery = dbQuery.eq('user_role', role);
    }
    if (manager_id) {
      dbQuery = dbQuery.eq('manager_id', manager_id);
    }
    
    // Department can match code, name or ID
    if (department) {
      dbQuery = dbQuery.or(`department_code.eq.${department},department_name.ilike.%${department}%`);
    }

    // Office can match name or city
    if (office) {
      dbQuery = dbQuery.or(`office_name.ilike.%${office}%,office_city.ilike.%${office}%`);
    }

    // ── 2. Keyword Search ───────────────────────────────────────────────────
    if (q && q.trim() !== '') {
      const cleanQ = q.trim();
      dbQuery = dbQuery.or(
        `first_name.ilike.%${cleanQ}%,last_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%,employee_id.ilike.%${cleanQ}%,job_title.ilike.%${cleanQ}%`
      );
    }

    // ── 3. Sorting & Pagination ─────────────────────────────────────────────
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data, count, error } = await dbQuery;

    if (error) {
      logger.error({ err: error, query }, 'DirectoryService.search failed');
      throw new DatabaseError(error.message);
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    };
  }
}

export const directoryService = new DirectoryService();
