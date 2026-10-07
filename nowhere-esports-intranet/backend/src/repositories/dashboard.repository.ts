import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';

export class DashboardRepository {
  async getSystemStats(): Promise<any> {
    // Total registered users
    const { count: totalUsers, error: userErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (userErr) throw new DatabaseError(userErr.message);

    // Active sessions (active status)
    const { count: activeUsers, error: activeErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeErr) throw new DatabaseError(activeErr.message);

    // Login statistics today (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: loginsToday, error: loginErr } = await supabaseAdmin
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'USER_LOGIN')
      .gte('created_at', oneDayAgo);

    if (loginErr) throw new DatabaseError(loginErr.message);

    // Security events today (e.g. failed logins, password changes)
    const { count: securityEvents, error: secErr } = await supabaseAdmin
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .in('action', ['PASSWORD_CHANGED', 'ROLE_UPDATED', 'ACCOUNT_DELETED'])
      .gte('created_at', oneDayAgo);

    if (secErr) throw new DatabaseError(secErr.message);

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      loginsToday: loginsToday || 0,
      securityEventsToday: securityEvents || 0,
    };
  }

  async getHRStats(): Promise<any> {
    // Total active employees
    const { count: activeEmp, error: activeErr } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeErr) throw new DatabaseError(activeErr.message);

    // Birthdays this month
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const { data: birthdayProfiles, error: birthErr } = await supabaseAdmin
      .from('profiles')
      .select('id, birthday');

    if (birthErr) throw new DatabaseError(birthErr.message);

    const birthdaysThisMonth = (birthdayProfiles || []).filter((p) => {
      if (!p.birthday) return false;
      const birthMonth = new Date(p.birthday).getMonth() + 1;
      return birthMonth === currentMonth;
    }).length;

    // New employees this month (hire_date within current month)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { count: newHires, error: hireErr } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .gte('hire_date', firstDayOfMonth);

    if (hireErr) throw new DatabaseError(hireErr.message);

    return {
      activeEmployees: activeEmp || 0,
      birthdaysThisMonth,
      newHiresThisMonth: newHires || 0,
    };
  }

  async getManagerStats(managerId: string): Promise<any> {
    // Direct reports count
    const { count: reportsCount, error: reportsErr } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', managerId)
      .eq('status', 'active');

    if (reportsErr) throw new DatabaseError(reportsErr.message);

    return {
      directReportsCount: reportsCount || 0,
      pendingApprovalsCount: 0, // Placeholder approval stats
      teamAttendanceSummary: '100% present', // Placeholder summary
    };
  }

  async getRecentActivity(limit: number = 10): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  }
}

export const dashboardRepository = new DashboardRepository();
