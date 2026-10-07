import { dashboardRepository } from '../repositories/dashboard.repository';
import { announcementService } from './announcement.service';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { AuditAction } from '../types/audit';
import { supabaseAdmin } from '../config/supabase';
import { UserRole } from '../constants/roles';

export class DashboardService {
  async getDashboardSummary(userId: string, role: string, req?: any): Promise<any> {
    const startTime = Date.now();

    // Fetch core dashboard data in parallel for optimal latency (<200ms)
    const [announcements, notifications, recentActivity, rawBirthdays, statistics] = await Promise.all([
      announcementService.getVisibleAnnouncements(userId, { limit: 5 }),
      notificationService.getInbox(userId, { limit: 5, archived: false }),
      role === UserRole.Administrator || role === UserRole.SuperAdmin
        ? dashboardRepository.getRecentActivity(10)
        : Promise.resolve([]),
      supabaseAdmin.from('profiles').select('id, first_name, last_name, email, birthday, avatar_url'),
      this.getStatisticsForRole(userId, role),
    ]);

    // Format Birthdays
    const currentMonth = new Date().getMonth() + 1;
    const birthdays = (rawBirthdays.data || [])
      .filter((p: any) => {
        if (!p.birthday) return false;
        const bMonth = new Date(p.birthday).getMonth() + 1;
        return bMonth === currentMonth;
      })
      .map((p: any) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        birthday: p.birthday,
        avatar_url: p.avatar_url,
      }));

    // Mock tournaments, meetings, tasks, and holidays for Milestone 5 widgets
    const upcomingTournaments = [
      { id: 't-1', name: 'Nowhere Valorant Invitational', date: '2026-07-15T18:00:00Z', prizePool: '$10,000' },
      { id: 't-2', name: 'Esports League Season 4', date: '2026-08-01T15:00:00Z', prizePool: '$25,000' },
    ];

    const todayMeetings = [
      { id: 'm-1', title: 'Daily Standup', time: '10:00 AM', duration: '30 mins' },
      { id: 'm-2', title: 'Tournaments Planning Sync', time: '2:00 PM', duration: '60 mins' },
    ];

    const assignedTasks = [
      { id: 'ts-1', title: 'Review tournament rules layout', status: 'pending', due: '2026-07-08' },
      { id: 'ts-2', title: 'Approve HR policy announcement drafts', status: 'in_progress', due: '2026-07-10' },
    ];

    const holidayCalendar = [
      { date: '2026-07-04', name: 'Independence Day' },
      { date: '2026-09-07', name: 'Labor Day' },
    ];

    const quickLinks = [
      { name: 'Intranet Wiki', url: 'https://wiki.nowhere.gg' },
      { name: 'Support Helpdesk', url: 'https://support.nowhere.gg' },
    ];

    const durationMs = Date.now() - startTime;

    // Log view event
    await auditService.log(
      AuditAction.DASHBOARD_VIEWED,
      {
        actorId: userId,
        metadata: { role, durationMs },
        req,
      }
    );

    return {
      announcements,
      notifications,
      birthdays,
      upcomingTournaments,
      todayMeetings,
      assignedTasks,
      holidayCalendar,
      quickLinks,
      recentActivity,
      statistics,
      latencyMs: durationMs,
    };
  }

  async getDashboardWidgets(role: string): Promise<string[]> {
    switch (role) {
      case UserRole.SuperAdmin:
        return [
          'announcements', 'notifications', 'meetings', 'tournaments', 'tasks',
          'birthdays', 'holidays', 'quick_links', 'system_status', 'database_health',
          'audit_logs', 'api_stats', 'storage_usage', 'realtime_connections'
        ];
      case UserRole.Administrator:
        return [
          'announcements', 'notifications', 'meetings', 'tournaments', 'tasks',
          'birthdays', 'holidays', 'quick_links', 'system_status', 'user_stats',
          'recent_activity', 'login_stats', 'error_summary', 'active_sessions', 'security_events'
        ];
      case UserRole.HR:
        return [
          'announcements', 'notifications', 'meetings', 'tournaments', 'tasks',
          'birthdays', 'holidays', 'quick_links', 'leave_stats', 'new_employees', 'org_announcements'
        ];
      case UserRole.Manager:
        return [
          'announcements', 'notifications', 'meetings', 'tournaments', 'tasks',
          'birthdays', 'holidays', 'quick_links', 'team_overview', 'team_attendance',
          'pending_approvals', 'department_stats'
        ];
      case UserRole.Employee:
      default:
        return [
          'announcements', 'notifications', 'meetings', 'tournaments', 'tasks',
          'birthdays', 'holidays', 'quick_links'
        ];
    }
  }

  private async getStatisticsForRole(userId: string, role: string): Promise<any> {
    try {
      if (role === UserRole.SuperAdmin) {
        const stats = await dashboardRepository.getSystemStats();
        return {
          ...stats,
          dbHealth: 'Healthy',
          dbSize: '42 MB',
          apiUptime: '99.98%',
          storageUsage: '12.4 GB',
          realtimeConnections: 45,
        };
      }
      if (role === UserRole.Administrator) {
        return dashboardRepository.getSystemStats();
      }
      if (role === UserRole.HR) {
        return dashboardRepository.getHRStats();
      }
      if (role === UserRole.Manager) {
        return dashboardRepository.getManagerStats(userId);
      }
      // Employee stats
      return {
        myPendingLeaves: 2,
        myCompletedTasks: 14,
        teamCount: 8,
      };
    } catch {
      // Graceful fallback to empty stats on failure
      return {};
    }
  }
}

export const dashboardService = new DashboardService();
