/**
 * VIGILANCE Nowhere Esports Intranet - Mock JSON API Routes
 * Exposes realistic RESTful tournament and staff data.
 */

import { Router, Request, Response } from 'express';

export const apiRouter = Router();

const MOCK_API_TOURNAMENTS = [
  {
    id: 'trn-apex-2026-s1',
    title: 'Apex Masters Spring Major 2026',
    game: 'Apex Legends',
    region: 'North America / EMEA',
    status: 'ACTIVE',
    teams_registered: 64,
    bracket_type: 'DOUBLE_ELIMINATION',
    prize_usd: 250000,
    server_regions: ['us-east', 'eu-central', 'ap-northeast'],
  },
  {
    id: 'trn-val-2026-inv',
    title: 'Valorant Championship Series: Tokyo Invitational',
    game: 'Valorant',
    region: 'APAC',
    status: 'REGISTRATION',
    teams_registered: 16,
    bracket_type: 'ROUND_ROBIN_PLAYOFFS',
    prize_usd: 500000,
    server_regions: ['ap-northeast', 'ap-southeast'],
  },
  {
    id: 'trn-cs2-2026-clash',
    title: 'CS2 Premier Winter Clash',
    game: 'Counter-Strike 2',
    region: 'Europe',
    status: 'UPCOMING',
    teams_registered: 16,
    bracket_type: 'SWISS_SYSTEM',
    prize_usd: 1000000,
    server_regions: ['eu-west', 'eu-north'],
  },
];

const MOCK_API_STAFF = [
  {
    id: 'stf-001',
    name: 'Marcus Vance',
    role: 'Head of Tournament Operations',
    department: 'Broadcast & Esports',
    email: 'm.vance@nowhere-esports.local',
    clearance_level: 3,
  },
  {
    id: 'stf-002',
    name: 'Elena Rostova',
    role: 'Chief Broadcast Engineer',
    department: 'Production & AV',
    email: 'e.rostova@nowhere-esports.local',
    clearance_level: 3,
  },
  {
    id: 'stf-003',
    name: 'Devon "Apex" Sterling',
    role: 'Lead Observer & Referee',
    department: 'Match Operations',
    email: 'd.sterling@nowhere-esports.local',
    clearance_level: 2,
  },
  {
    id: 'stf-004',
    name: 'Sarah Chen',
    role: 'Infrastructure & Anti-Cheat Specialist',
    department: 'IT Security',
    email: 's.chen@nowhere-esports.local',
    clearance_level: 4,
  },
];

// GET /api/v1/tournaments - List tournaments
apiRouter.get('/v1/tournaments', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    count: MOCK_API_TOURNAMENTS.length,
    data: MOCK_API_TOURNAMENTS,
  });
});

// GET /api/v1/tournaments/:id - Single tournament detail
apiRouter.get('/v1/tournaments/:id', (req: Request, res: Response) => {
  const tournament = MOCK_API_TOURNAMENTS.find(t => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({
      status: 'error',
      error: 'TournamentNotFound',
      message: `No tournament found with identifier '${req.params.id}'`,
    });
    return;
  }
  res.json({
    status: 'success',
    data: tournament,
  });
});

// POST /api/v1/tournaments - Create tournament (Decoy API trap)
apiRouter.post('/v1/tournaments', (_req: Request, res: Response) => {
  res.status(401).json({
    status: 'error',
    error: 'AuthenticationRequired',
    message: 'Bearer authorization token with tournament:write scope is required.',
  });
});

// GET /api/v1/staff - List staff
apiRouter.get('/v1/staff', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    count: MOCK_API_STAFF.length,
    data: MOCK_API_STAFF,
  });
});

// GET /api/v1/staff/:id - Single staff detail
apiRouter.get('/v1/staff/:id', (req: Request, res: Response) => {
  const member = MOCK_API_STAFF.find(s => s.id === req.params.id);
  if (!member) {
    res.status(404).json({
      status: 'error',
      error: 'StaffNotFound',
      message: `Staff member '${req.params.id}' does not exist in roster.`,
    });
    return;
  }
  res.json({
    status: 'success',
    data: member,
  });
});
