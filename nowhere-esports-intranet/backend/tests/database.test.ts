import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employeeRepository } from '../src/repositories/employee.repository';
import { departmentRepository } from '../src/repositories/department.repository';
import { announcementRepository } from '../src/repositories/announcement.repository';
import { tournamentRepository } from '../src/repositories/tournament.repository';
import { matchRepository } from '../src/repositories/match.repository';
import { documentRepository } from '../src/repositories/document.repository';
import { supportRepository } from '../src/repositories/support.repository';
import { notificationRepository } from '../src/repositories/notification.repository';
import { supabaseAdmin } from '../src/config/supabase';

// ---------------------------------------------------------------------------
// Database repositories & entities tests — runs against mocked Supabase client
// ---------------------------------------------------------------------------

const mockId = '00000000-0000-0000-0000-000000000001';

describe('Business Database Repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── EmployeeRepository ────────────────────────────────────────────────────
  describe('EmployeeRepository', () => {
    it('should find employee by ID', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: mockId, employee_id: 'NWE-2026-0001', profiles: { email: 'test@nowhere.gg' } },
          error: null,
        }),
      } as any);

      const res = await employeeRepository.findById(mockId);
      expect(res.employee_id).toBe('NWE-2026-0001');
      expect(res.profiles.email).toBe('test@nowhere.gg');
    });

    it('should soft delete employee', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({ error: null } as any),
      } as any);

      await expect(employeeRepository.softDelete(mockId)).resolves.toBeUndefined();
    });
  });

  // ── DepartmentRepository ──────────────────────────────────────────────────
  describe('DepartmentRepository', () => {
    it('should retrieve all departments', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [{ id: 'dept-1', name: 'Esports Ops', code: 'ESP_OPS' }],
          error: null,
        } as any),
      } as any);

      const list = await departmentRepository.findAll();
      expect(list).toHaveLength(1);
      expect(list[0].code).toBe('ESP_OPS');
    });
  });

  // ── AnnouncementRepository ────────────────────────────────────────────────
  describe('AnnouncementRepository', () => {
    it('should retrieve published announcements', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: [{ id: 'ann-1', title: 'Intranet Launch', status: 'published' }],
          error: null,
        } as any),
      } as any);

      const list = await announcementRepository.findAllPublished();
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('Intranet Launch');
    });
  });

  // ── TournamentRepository ──────────────────────────────────────────────────
  describe('TournamentRepository', () => {
    it('should create new tournament', async () => {
      const tourneyInput = { name: 'VCT Champions 2026', game: 'Valorant', organizer: 'Riot Games', start_date: '2026-08-01' };
      
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: 'tourney-1', ...tourneyInput },
          error: null,
        }),
      } as any);

      const res = await tournamentRepository.create(tourneyInput);
      expect(res.name).toBe('VCT Champions 2026');
      expect(res.id).toBe('tourney-1');
    });
  });

  // ── MatchRepository ───────────────────────────────────────────────────────
  describe('MatchRepository', () => {
    it('should fetch match details with results', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: { id: 'match-1', match_code: 'MCH-2026-0001', match_results: { score_home: 2, score_away: 1 } },
          error: null,
        }),
      } as any);

      const res = await matchRepository.findById('match-1');
      expect(res.match_code).toBe('MCH-2026-0001');
      expect(res.match_results.score_home).toBe(2);
    });
  });

  // ── DocumentRepository ────────────────────────────────────────────────────
  describe('DocumentRepository', () => {
    it('should create folder', async () => {
      const folderInput = { name: 'HR Rules', created_by: mockId };
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: 'folder-1', ...folderInput },
          error: null,
        }),
      } as any);

      const res = await documentRepository.createFolder(folderInput);
      expect(res.id).toBe('folder-1');
      expect(res.name).toBe('HR Rules');
    });
  });

  // ── SupportRepository ─────────────────────────────────────────────────────
  describe('SupportRepository', () => {
    it('should create support ticket', async () => {
      const ticketInput = { category_id: 'cat-1', creator_id: mockId, title: 'Laptop won\'t turn on', description: 'Screen black' };
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: 'ticket-1', ...ticketInput, status: 'open' },
          error: null,
        }),
      } as any);

      const res = await supportRepository.create(ticketInput);
      expect(res.id).toBe('ticket-1');
      expect(res.status).toBe('open');
    });
  });

  // ── NotificationRepository ────────────────────────────────────────────────
  describe('NotificationRepository', () => {
    it('should retrieve unread notifications for a user profile', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: [{ notification_id: 'notif-1', profile_id: mockId, title: 'New announcement' }],
          error: null,
        } as any),
      } as any);

      const list = await notificationRepository.findUnreadByProfileId(mockId);
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('New announcement');
    });
  });
});
