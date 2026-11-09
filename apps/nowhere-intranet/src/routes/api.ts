/**
 * VIGILANCE Nowhere Esports Intranet - Mock JSON API Routes
 * Exposes realistic RESTful tournament and staff data.
 */

import { Router, Request, Response } from 'express';

export const apiRouter = Router();

export const MOCK_API_TOURNAMENTS = [
  {
    id: 'trn-val-2026-inv',
    title: 'VALORANT Masters Tokyo: Champions Invitational',
    game: 'VALORANT',
    game_slug: 'valorant',
    region: 'APAC / Global',
    status: 'LIVE_NOW',
    status_label: 'LIVE NOW',
    teams_registered: 16,
    bracket_type: 'DOUBLE_ELIMINATION_BO3',
    prize_usd: 500000,
    prize_formatted: '$500,000 USD',
    current_match: 'Grand Final: Nowhere Esports (13) vs Sentinels (9)',
    current_map: 'Map 2: BIND [Overtime]',
    viewers: '382,400',
    accent_color: '#ff4655',
    category: '5v5 Tactical FPS',
    stream_video_id: '5W8f7m4X6lI',
    stream_title: 'VALORANT Champions Tour: Grand Finals | Nowhere Esports vs Sentinels',
    banner_image: '/images/banners/banner-valorant.jpg',
    server_regions: ['ap-northeast', 'ap-southeast', 'us-west'],
  },
  {
    id: 'trn-bgmi-2026-bms',
    title: 'BGMI Pro Series (BMS) 2026: Season 1 Finals',
    game: 'BGMI',
    game_slug: 'bgmi',
    region: 'India / South Asia',
    status: 'LIVE_NOW',
    status_label: 'LIVE NOW',
    teams_registered: 32,
    bracket_type: 'BATTLE_ROYALE_FINALS',
    prize_usd: 120000,
    prize_formatted: '₹1,00,00,000 INR ($120,000)',
    current_match: 'Finals Day 3: Match 4 / 6 [Erangel]',
    current_map: 'Circle 5 • 8 Squads Left • Nowhere: 54 pts',
    viewers: '254,100',
    accent_color: '#f59e0b',
    category: 'Battle Royale',
    stream_video_id: 'y881t8ilMyc',
    stream_title: 'BGMI Pro Series 2026 Finals Day 3 | Official Live Broadcast',
    banner_image: '/images/banners/banner-bgmi.jpg',
    server_regions: ['in-mumbai', 'in-delhi', 'ap-south'],
  },
  {
    id: 'trn-ff-2026-ffws',
    title: 'Free Fire World Series (FFWS) 2026: Spring Finals',
    game: 'Free Fire',
    game_slug: 'freefire',
    region: 'Global / South Asia',
    status: 'LIVE_NOW',
    status_label: 'LIVE NOW',
    teams_registered: 18,
    bracket_type: 'SURVIVAL_BATTLE_ROYALE_BO8',
    prize_usd: 500000,
    prize_formatted: '$500,000 USD (₹4.1 Cr)',
    current_match: 'Grand Finals: Match 6 / 8 [Bermuda]',
    current_map: 'Zone Phase 6 • Total Gaming vs Nowhere FF',
    viewers: '438,200',
    accent_color: '#f97316',
    category: 'Mobile Battle Royale',
    stream_video_id: 'g2q6N_B9G5E',
    stream_title: 'Free Fire World Series (FFWS) Spring Finals | Hindi & Global Cast',
    banner_image: '/images/banners/banner-freefire.jpg',
    server_regions: ['in-mumbai', 'sg-singapore', 'br-saopaulo'],
  },
  {
    id: 'trn-efootball-2026-pro',
    title: 'eFootball Championship Pro: Season Kickoff',
    game: 'eFootball',
    game_slug: 'efootball',
    region: 'Global / Europe & Asia',
    status: 'LIVE_NOW',
    status_label: 'LIVE NOW',
    teams_registered: 24,
    bracket_type: 'LEAGUE_ROUND_ROBIN',
    prize_usd: 200000,
    prize_formatted: '$200,000 USD',
    current_match: 'Matchday 4: Nowhere FC (3) vs FC Bayern Esports (2)',
    current_map: '88th Min • Extra Time [Leg 2 Decider]',
    viewers: '172,400',
    accent_color: '#0284c7',
    category: 'Football Simulation',
    stream_video_id: 'Vb1n1c3q_B0',
    stream_title: 'eFootball Championship Pro 2026: Matchday 4 | Pro Club Stream',
    banner_image: '/images/banners/banner-efootball.jpg',
    server_regions: ['eu-west', 'ap-northeast', 'in-mumbai'],
  },
  {
    id: 'trn-cs2-2026-clash',
    title: 'CS2 Premier Winter Major Cologne',
    game: 'Counter-Strike 2',
    game_slug: 'cs2',
    region: 'Europe',
    status: 'LIVE_NOW',
    status_label: 'LIVE NOW',
    teams_registered: 16,
    bracket_type: 'SWISS_SYSTEM',
    prize_usd: 1000000,
    prize_formatted: '$1,000,000 USD',
    current_match: 'Semifinal: Nowhere (16) vs FaZe Clan (12)',
    current_map: 'Decider: Mirage (Round 28)',
    viewers: '516,700',
    accent_color: '#f97316',
    category: 'Tactical FPS',
    stream_video_id: 'PkjC3a_u4u4',
    stream_title: 'CS2 Premier Winter Major Cologne: Semifinal Nowhere vs FaZe',
    server_regions: ['eu-west', 'eu-north', 'eu-central'],
  },
  {
    id: 'trn-apex-2026-s1',
    title: 'Apex Masters Spring Major 2026',
    game: 'Apex Legends',
    game_slug: 'apex',
    region: 'North America / EMEA',
    status: 'ACTIVE',
    status_label: 'MATCH POINT',
    teams_registered: 64,
    bracket_type: 'DOUBLE_ELIMINATION',
    prize_usd: 250000,
    prize_formatted: '$250,000 USD',
    current_match: 'Match Point Finals: Storm Point (Match 5)',
    current_map: 'Nowhere: 64 pts (Match Point Eligible)',
    viewers: '148,800',
    accent_color: '#ef4444',
    category: 'Hero Battle Royale',
    stream_video_id: '9bZkp7q19f0',
    stream_title: 'ALGS Spring Major: Match Point Finals Live Broadcast',
    server_regions: ['us-east', 'eu-central', 'ap-northeast'],
  },
  {
    id: 'trn-codm-2026-world',
    title: 'Call of Duty: Warzone Global Gauntlet',
    game: 'Call of Duty',
    game_slug: 'cod',
    region: 'Global / Americas',
    status: 'UPCOMING',
    status_label: 'STARTING SOON',
    teams_registered: 32,
    bracket_type: 'CUSTOM_LOBBY_TRIOS',
    prize_usd: 150000,
    prize_formatted: '$150,000 USD',
    current_match: 'Pre-Match Briefing & Lobby Check-In',
    current_map: 'Al Mazrah • 32 Trios Ready',
    viewers: '82,400',
    accent_color: '#84cc16',
    category: 'Tactical BR',
    stream_video_id: '7nosX-PVtPo',
    stream_title: 'Call of Duty Warzone: Global Gauntlet Warmup & Stream',
    server_regions: ['us-central', 'us-east'],
  },
  {
    id: 'trn-lol-2026-inv',
    title: 'League of Legends: Mid-Season Invitational',
    game: 'League of Legends',
    game_slug: 'lol',
    region: 'Global',
    status: 'REGISTRATION',
    status_label: 'REGISTRATION',
    teams_registered: 12,
    bracket_type: 'ROUND_ROBIN_PLAYOFFS',
    prize_usd: 750000,
    prize_formatted: '$750,000 USD',
    current_match: 'Bracket Seeding & Team Roster Lock',
    current_map: "Summoner's Rift (Patch 16.4)",
    viewers: '190,000',
    accent_color: '#3b82f6',
    category: 'MOBA',
    stream_video_id: 'dQw4w9WgXcQ',
    stream_title: 'League of Legends: Mid-Season Invitational Live',
    server_regions: ['kr-seoul', 'cn-shanghai', 'eu-west'],
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

// GET /api/v1/tournaments - List tournaments (with optional game or status filter)
apiRouter.get('/v1/tournaments', (req: Request, res: Response) => {
  const gameFilter = (req.query.game as string || '').toLowerCase().trim();
  const statusFilter = (req.query.status as string || '').toLowerCase().trim();

  let list = MOCK_API_TOURNAMENTS;
  if (gameFilter && gameFilter !== 'all') {
    list = list.filter(
      t => t.game.toLowerCase().includes(gameFilter) || (t.game_slug && t.game_slug.toLowerCase() === gameFilter)
    );
  }
  if (statusFilter && statusFilter !== 'all') {
    list = list.filter(t => t.status.toLowerCase() === statusFilter);
  }

  res.json({
    status: 'success',
    count: list.length,
    data: list,
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
