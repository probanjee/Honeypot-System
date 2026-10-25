/**
 * VIGILANCE Nowhere Esports Intranet - Web (EJS) Routes
 * Server-side rendered views using fictional esports corporate data.
 */

import { Router, Request, Response } from 'express';

export const webRouter = Router();

// Mock esports tournament data
const MOCK_TOURNAMENTS = [
  {
    id: 'trn-apex-2026-s1',
    title: 'Apex Masters Spring Major 2026',
    game: 'Apex Legends',
    region: 'North America / EMEA',
    status: 'In Progress (Semifinals)',
    format: 'Battle Royale 60-Point Match Point',
    prize_pool: '$250,000 USD',
  },
  {
    id: 'trn-val-2026-inv',
    title: 'Valorant Championship Series: Tokyo Invitational',
    game: 'Valorant',
    region: 'APAC',
    status: 'Registration Open',
    format: 'Double Elimination Bo3',
    prize_pool: '$500,000 USD',
  },
  {
    id: 'trn-cs2-2026-clash',
    title: 'CS2 Premier Winter Clash',
    game: 'Counter-Strike 2',
    region: 'Europe',
    status: 'Upcoming',
    format: 'Swiss System 16 Teams',
    prize_pool: '$1,000,000 USD',
  },
];

// Mock staff roster
const MOCK_STAFF = [
  {
    id: 'stf-001',
    name: 'Marcus Vance',
    role: 'Head of Tournament Operations',
    department: 'Broadcast & Esports',
    email: 'm.vance@nowhere-esports.local',
    clearance: 'Tier 3 (Lead Admin)',
  },
  {
    id: 'stf-002',
    name: 'Elena Rostova',
    role: 'Chief Broadcast Engineer',
    department: 'Production & AV',
    email: 'e.rostova@nowhere-esports.local',
    clearance: 'Tier 3 (Broadcast Root)',
  },
  {
    id: 'stf-003',
    name: 'Devon "Apex" Sterling',
    role: 'Lead Observer & Referee',
    department: 'Match Operations',
    email: 'd.sterling@nowhere-esports.local',
    clearance: 'Tier 2 (Observer)',
  },
  {
    id: 'stf-004',
    name: 'Sarah Chen',
    role: 'Infrastructure & Anti-Cheat Specialist',
    department: 'IT Security',
    email: 's.chen@nowhere-esports.local',
    clearance: 'Tier 4 (Security Core)',
  },
];

// Homepage
webRouter.get('/', (_req: Request, res: Response) => {
  res.render('pages/index', {
    tournaments: MOCK_TOURNAMENTS,
  });
});

// Tournament Listings
webRouter.get('/tournaments', (req: Request, res: Response) => {
  const searchQuery = (req.query.search as string || '').toLowerCase();
  let filtered = MOCK_TOURNAMENTS;
  if (searchQuery) {
    filtered = MOCK_TOURNAMENTS.filter(
      t => t.title.toLowerCase().includes(searchQuery) || t.game.toLowerCase().includes(searchQuery)
    );
  }
  res.render('pages/tournaments', {
    tournaments: filtered,
  });
});

// Staff Directory
webRouter.get('/staff/directory', (_req: Request, res: Response) => {
  res.render('pages/staff-directory', {
    staff: MOCK_STAFF,
  });
});

// Staff Dashboard (Decoy Restricted Portal)
webRouter.get('/staff/dashboard', (req: Request, res: Response) => {
  // Always restrict access - this is a decoy portal requiring authentication
  res.status(403).render('errors/403', {
    title: 'Staff Portal Access Denied',
    message: 'Active staff session not found. Please log in via the authorized SSO gateway.',
  });
});

// Player Login - GET
webRouter.get('/login', (_req: Request, res: Response) => {
  res.render('pages/login', { error: null });
});

// Player Login - POST (Honeypot trap: never authenticates, returns 401)
webRouter.post('/login', (_req: Request, res: Response) => {
  res.status(401).render('pages/login', {
    error: 'Authentication failed. Invalid esports identifier or passcode.',
  });
});

// Decoy Administrative Login - GET
webRouter.get('/admin/login', (_req: Request, res: Response) => {
  res.render('pages/admin-login', { error: null });
});

// Decoy Administrative Login - POST (Honeypot trap: never authenticates, returns 401)
webRouter.post('/admin/login', (_req: Request, res: Response) => {
  res.status(401).render('pages/admin-login', {
    error: 'Administrative verification rejected. Hardware token signature mismatch.',
  });
});
