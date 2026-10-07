import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import teamRoutes from '../src/routes/team.routes';
import playerRoutes from '../src/routes/player.routes';
import tournamentRoutes from '../src/routes/tournament.routes';
import matchRoutes from '../src/routes/match.routes';
import statisticsRoutes from '../src/routes/statistics.routes';
import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';
import { UserRole } from '../src/constants/roles';
import { supabaseAdmin } from '../src/config/supabase';
import { auditRepository } from '../src/repositories/audit.repository';
import { standingService } from '../src/services/standing.service';
import { standingRepository } from '../src/repositories/standing.repository';
import { matchRepository } from '../src/repositories/match.repository';
import { tournamentRepository } from '../src/repositories/tournament.repository';
import { statisticsService } from '../src/services/statistics.service';
import { statisticsRepository } from '../src/repositories/statistics.repository';

vi.mock('../src/middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: req.headers['x-test-user-id'] || '00000000-0000-0000-0000-000000000001',
      email: 'test@nowhere.gg',
      role: req.headers['x-test-user-role'] || UserRole.Employee,
    };
    next();
  },
}));

vi.mock('../src/repositories/audit.repository', () => ({
  auditRepository: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const ids = {
  teamA: '00000000-0000-0000-0000-000000000101',
  teamB: '00000000-0000-0000-0000-000000000102',
  player: '00000000-0000-0000-0000-000000000201',
  tournament: '00000000-0000-0000-0000-000000000301',
  match: '00000000-0000-0000-0000-000000000401',
};

type Result = { data?: any; error?: any; count?: number | null };

function createApp(path: string, routes: any) {
  const app = express();
  app.use(express.json());
  app.use(path, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

function createBuilder(nextResult: () => Result) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(nextResult())),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(nextResult())),
    then: vi.fn().mockImplementation((resolve, reject) => Promise.resolve(nextResult()).then(resolve, reject)),
  };
  return builder;
}

function mockSupabaseQueues(queues: Record<string, Result[]>) {
  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    const nextResult = () => {
      const queue = queues[table] ?? [];
      return queue.shift() ?? { data: null, error: null, count: 0 };
    };
    return createBuilder(nextResult);
  });
}

describe('Esports Management Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a team and records an audit event', async () => {
    mockSupabaseQueues({
      teams: [{
        data: {
          id: ids.teamA,
          team_name: 'Nowhere Valorant',
          short_name: 'NWV',
          slug: 'nowhere-valorant',
          status: 'active',
        },
        error: null,
      }],
    });

    const res = await request(createApp('/teams', teamRoutes))
      .post('/teams')
      .set('x-test-user-role', UserRole.TournamentAdmin)
      .send({
        team_name: 'Nowhere Valorant',
        short_name: 'NWV',
        region: 'APAC',
        social_links: { x: 'https://x.com/nowhere' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.team_name).toBe('Nowhere Valorant');
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'TEAM_CREATED' }));
  });

  it('blocks employees from creating teams and validates required team fields', async () => {
    const app = createApp('/teams', teamRoutes);

    const forbidden = await request(app)
      .post('/teams')
      .set('x-test-user-role', UserRole.Employee)
      .send({ team_name: 'No Access', short_name: 'NA' });

    const invalid = await request(app)
      .post('/teams')
      .set('x-test-user-role', UserRole.TournamentAdmin)
      .send({ region: 'NA' });

    expect(forbidden.status).toBe(403);
    expect(invalid.status).toBe(400);
  });

  it('lets an assigned manager update their team', async () => {
    mockSupabaseQueues({
      teams: [
        { data: { id: ids.teamA, manager_id: 'manager-1', team_name: 'Old' }, error: null },
        { data: { id: ids.teamA, manager_id: 'manager-1', team_name: 'New Name' }, error: null },
      ],
    });

    const res = await request(createApp('/teams', teamRoutes))
      .patch(`/teams/${ids.teamA}`)
      .set('x-test-user-id', 'manager-1')
      .set('x-test-user-role', UserRole.Manager)
      .send({ team_name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.team_name).toBe('New Name');
  });

  it('registers and transfers players with audit logging', async () => {
    const app = createApp('/players', playerRoutes);

    mockSupabaseQueues({
      players: [{
        data: {
          id: ids.player,
          player_tag: 'Zero',
          real_name: 'Zara Zero',
          role: 'Duelist',
          current_team: ids.teamA,
          status: 'active',
        },
        error: null,
      }],
      player_team_history: [{ data: null, error: null }],
    });

    const created = await request(app)
      .post('/players')
      .set('x-test-user-role', UserRole.TournamentAdmin)
      .send({
        player_tag: 'Zero',
        real_name: 'Zara Zero',
        role: 'Duelist',
        current_team: ids.teamA,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.player_tag).toBe('Zero');

    mockSupabaseQueues({
      players: [
        { data: { id: ids.player, current_team: ids.teamA, status: 'active' }, error: null },
        { data: { id: ids.player, current_team: ids.teamB, status: 'active' }, error: null },
      ],
      player_team_history: [{ data: null, error: null }],
    });

    const transferred = await request(app)
      .patch(`/players/${ids.player}/transfer`)
      .set('x-test-user-role', UserRole.TournamentAdmin)
      .send({ current_team: ids.teamB });

    expect(transferred.status).toBe(200);
    expect(transferred.body.data.current_team).toBe(ids.teamB);
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLAYER_TRANSFERRED' }));
  });

  it('creates and publishes tournaments', async () => {
    const app = createApp('/tournaments', tournamentRoutes);

    mockSupabaseQueues({
      tournaments: [{
        data: {
          id: ids.tournament,
          tournament_name: 'Nowhere Masters',
          game: 'Valorant',
          format: 'round_robin',
          status: 'draft',
        },
        error: null,
      }],
    });

    const created = await request(app)
      .post('/tournaments')
      .set('x-test-user-role', UserRole.TournamentAdmin)
      .send({
        tournament_name: 'Nowhere Masters',
        game: 'Valorant',
        format: 'round_robin',
        organizer: 'Nowhere',
        start_date: '2026-08-01',
        end_date: '2026-08-07',
        max_teams: 8,
      });

    expect(created.status).toBe(201);

    mockSupabaseQueues({
      tournaments: [
        { data: { id: ids.tournament, status: 'draft' }, error: null },
        { data: { id: ids.tournament, status: 'published' }, error: null },
      ],
    });

    const published = await request(app)
      .post(`/tournaments/${ids.tournament}/publish`)
      .set('x-test-user-role', UserRole.TournamentAdmin);

    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('published');
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'TOURNAMENT_PUBLISHED' }));
  });

  it('updates match score and recalculates standings', async () => {
    mockSupabaseQueues({
      matches: [
        {
          data: {
            id: ids.match,
            tournament_id: ids.tournament,
            home_team_id: ids.teamA,
            away_team_id: ids.teamB,
            status: 'scheduled',
            scheduled_at: '2026-08-02T10:00:00.000Z',
            score_home: 0,
            score_away: 0,
          },
          error: null,
        },
        {
          data: {
            id: ids.match,
            tournament_id: ids.tournament,
            home_team_id: ids.teamA,
            away_team_id: ids.teamB,
            status: 'completed',
            score_home: 13,
            score_away: 10,
            winner: ids.teamA,
          },
          error: null,
        },
        {
          data: [{
            id: ids.match,
            tournament_id: ids.tournament,
            home_team_id: ids.teamA,
            away_team_id: ids.teamB,
            status: 'completed',
            score_home: 13,
            score_away: 10,
            winner: ids.teamA,
          }],
          error: null,
        },
      ],
      match_player_statistics: [{ data: null, error: null }],
      tournaments: [{ data: { id: ids.tournament, status: 'active' }, error: null }],
      tournament_standings: [{ data: null, error: null }],
    });

    const res = await request(createApp('/matches', matchRoutes))
      .patch(`/matches/${ids.match}/score`)
      .set('x-test-user-role', UserRole.TournamentAdmin)
      .send({
        score_home: 13,
        score_away: 10,
        winner: ids.teamA,
        player_statistics: [{
          player_id: ids.player,
          team_id: ids.teamA,
          kills: 24,
          assists: 8,
          deaths: 15,
          is_mvp: true,
        }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'MATCH_SCORE_CHANGED' }));
  });

  it('calculates standings from completed matches', async () => {
    vi.spyOn(tournamentRepository, 'findById').mockResolvedValueOnce({ id: ids.tournament });
    vi.spyOn(matchRepository, 'findCompletedByTournament').mockResolvedValueOnce([
      { tournament_id: ids.tournament, home_team_id: ids.teamA, away_team_id: ids.teamB, score_home: 2, score_away: 1, winner: ids.teamA },
      { tournament_id: ids.tournament, home_team_id: ids.teamB, away_team_id: ids.teamA, score_home: 1, score_away: 1, winner: null },
    ]);
    const upsert = vi.spyOn(standingRepository, 'upsertRows').mockResolvedValueOnce(undefined);

    const rows = await standingService.recalculateTournament(ids.tournament);

    expect(rows[0].team_id).toBe(ids.teamA);
    expect(rows[0].wins).toBe(1);
    expect(rows[0].draws).toBe(1);
    expect(rows[0].points).toBe(4);
    expect(upsert).toHaveBeenCalled();
  });

  it('generates player, team, and tournament statistics', async () => {
    vi.spyOn(statisticsRepository, 'findPlayerMatchStatistics').mockResolvedValueOnce([
      { player_id: ids.player, players: { player_tag: 'Zero' }, kills: 10, assists: 5, deaths: 2, is_mvp: true, is_win: true },
      { player_id: ids.player, players: { player_tag: 'Zero' }, kills: 7, assists: 3, deaths: 4, is_mvp: false, is_win: false },
    ]);
    vi.spyOn(statisticsRepository, 'findTeams').mockResolvedValueOnce([
      { id: ids.teamA, team_name: 'Alpha' },
      { id: ids.teamB, team_name: 'Bravo' },
    ]);
    vi.spyOn(statisticsRepository, 'findCompletedMatches').mockResolvedValueOnce([
      { home_team_id: ids.teamA, away_team_id: ids.teamB, score_home: 13, score_away: 10, winner: ids.teamA },
    ]);
    vi.spyOn(statisticsRepository, 'findTournaments')
      .mockResolvedValueOnce([{ id: ids.tournament, tournament_name: 'Masters', winner_team_id: ids.teamA }])
      .mockResolvedValueOnce([{ id: ids.tournament, tournament_name: 'Masters' }]);
    vi.spyOn(statisticsRepository, 'findMatches').mockResolvedValueOnce([
      { tournament_id: ids.tournament, status: 'completed' },
      { tournament_id: ids.tournament, status: 'scheduled' },
    ]);
    vi.spyOn(statisticsRepository, 'findTournamentTeams').mockResolvedValueOnce([
      { tournament_id: ids.tournament, team_id: ids.teamA, status: 'registered' },
      { tournament_id: ids.tournament, team_id: ids.teamB, status: 'registered' },
    ]);

    const players = await statisticsService.getPlayerStatistics();
    const teams = await statisticsService.getTeamStatistics();
    const tournaments = await statisticsService.getTournamentStatistics();

    expect(players[0]).toMatchObject({ player_id: ids.player, kills: 17, mvp_count: 1, matches_played: 2 });
    expect(teams[0]).toMatchObject({ team_id: ids.teamA, wins: 1, championships: 1, average_score: 13 });
    expect(tournaments[0]).toMatchObject({ tournament_id: ids.tournament, matches_played: 1, teams: 2, completion_percentage: 50 });
  });

  it('exposes statistics endpoints to authenticated employees', async () => {
    vi.spyOn(statisticsRepository, 'findPlayerMatchStatistics').mockResolvedValueOnce([]);

    const res = await request(createApp('/statistics', statisticsRoutes))
      .get('/statistics/players')
      .set('x-test-user-role', UserRole.Employee);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
