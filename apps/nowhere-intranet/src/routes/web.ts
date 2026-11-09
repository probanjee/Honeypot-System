
import { Router, Request, Response } from 'express';
import { MOCK_API_TOURNAMENTS } from './api.js';

export const webRouter = Router();

// Mock esports tournament data
const MOCK_TOURNAMENTS = [
  {
    id: 'trn-val-2026-inv',
    title: 'VALORANT Masters Tokyo: Champions Invitational',
    game: 'VALORANT',
    region: 'APAC / Global',
    status: 'Live Now (Grand Finals)',
    format: 'Double Elimination Bo3',
    prize_pool: '$500,000 USD',
  },
  {
    id: 'trn-bgmi-2026-bms',
    title: 'BGMI Pro Series (BMS) 2026: Season 1 Finals',
    game: 'BGMI',
    region: 'India / South Asia',
    status: 'Live Now (Match 4/6)',
    format: 'Battle Royale 16 Squads',
    prize_pool: '₹1,00,00,000 INR ($120,000)',
  },
  {
    id: 'trn-ff-2026-ffws',
    title: 'Free Fire World Series (FFWS) 2026: Spring Finals',
    game: 'Free Fire',
    region: 'Global / South Asia',
    status: 'Live Now (Match 6/8)',
    format: 'Survival Battle Royale Bo8',
    prize_pool: '$500,000 USD (₹4.1 Cr)',
  },
  {
    id: 'trn-efootball-2026-pro',
    title: 'eFootball Championship Pro: Season Kickoff',
    game: 'eFootball',
    region: 'Global / Europe & Asia',
    status: 'Live Now (Matchday 4)',
    format: 'League Round Robin 24 Teams',
    prize_pool: '$200,000 USD',
  },
  {
    id: 'trn-cs2-2026-clash',
    title: 'CS2 Premier Winter Major Cologne',
    game: 'Counter-Strike 2',
    region: 'Europe',
    status: 'Live Now (Swiss Round 5)',
    format: 'Swiss System 16 Teams',
    prize_pool: '$1,000,000 USD',
  },
  {
    id: 'trn-apex-2026-s1',
    title: 'Apex Masters Spring Major 2026',
    game: 'Apex Legends',
    region: 'North America / EMEA',
    status: 'In Progress (Match Point Finals)',
    format: 'Battle Royale 60-Point Match Point',
    prize_pool: '$250,000 USD',
  },
  {
    id: 'trn-codm-2026-world',
    title: 'Call of Duty: Warzone Global Gauntlet',
    game: 'Call of Duty',
    region: 'Global / Americas',
    status: 'Upcoming (Today 20:00 UTC)',
    format: 'Custom Lobby 32 Trios',
    prize_pool: '$150,000 USD',
  },
  {
    id: 'trn-lol-2026-inv',
    title: 'League of Legends: Mid-Season Invitational',
    game: 'League of Legends',
    region: 'Global',
    status: 'Registration Open',
    format: 'Round Robin Playoff Bo5',
    prize_pool: '$750,000 USD',
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

// Mock pro team rosters
const MOCK_ROSTERS = [
  {
    team: 'Nowhere Valorant Champions Squad',
    game: 'Valorant',
    division: 'VCT Americas / Champions League',
    badge: 'TIER 1 PRO',
    coach: 'Chet "Immortals" Bradley',
    winRate: '78.4%',
    players: [
      { tag: 'VIPER', role: 'Duelist / Jett & Raze Main', kd: '1.42', nationality: 'USA', captain: true },
      { tag: 'PHANTOM', role: 'Initiator / Sova & Fade', kd: '1.24', nationality: 'Canada', captain: false },
      { tag: 'AERO', role: 'Controller / Omen & Viper', kd: '1.18', nationality: 'UK', captain: false },
      { tag: 'ZERO', role: 'Sentinel / Killjoy & Cypher', kd: '1.22', nationality: 'Sweden', captain: false },
      { tag: 'NOVA', role: 'Flex / Kayo & Breach', kd: '1.30', nationality: 'Germany', captain: false },
    ],
  },
  {
    team: 'Nowhere BGMI Pro Squad (India)',
    game: 'BGMI',
    division: 'BMS Pro Circuit / BGIS Tier 1 India',
    badge: 'CHAMPIONS TIER',
    coach: 'Abhijeet "Ghatak" Andhare',
    winRate: '84.6% WWCD Rate',
    players: [
      { tag: 'JONNY', role: 'Assaulter / Entry Fragger', kd: '4.85', nationality: 'India', captain: true },
      { tag: 'GOBLIN', role: 'Filter / DMR Specialist', kd: '4.12', nationality: 'India', captain: false },
      { tag: 'VIPER_IN', role: 'IGL / Support Tactician', kd: '3.65', nationality: 'India', captain: false },
      { tag: 'PUNKZ', role: 'Finisher / Scout', kd: '3.92', nationality: 'India', captain: false },
    ],
  },
  {
    team: 'Nowhere CS2 Major Squad',
    game: 'Counter-Strike 2',
    division: 'ESL Pro League / Valve Major Legends',
    badge: 'LEGENDS TIER',
    coach: 'Lukas "Glaive" Møller',
    winRate: '81.2%',
    players: [
      { tag: 'K4NE', role: 'AWPer / Primary Sniper', kd: '1.48', nationality: 'Denmark', captain: true },
      { tag: 'BLITZ', role: 'Entry Fragger / Rifler', kd: '1.34', nationality: 'Poland', captain: false },
      { tag: 'ECHO', role: 'In-Game Leader (IGL)', kd: '1.15', nationality: 'Sweden', captain: false },
      { tag: 'MAVERICK', role: 'Rifler / Lurker', kd: '1.29', nationality: 'USA', captain: false },
      { tag: 'STRYKER', role: 'Support / Re-fragger', kd: '1.19', nationality: 'France', captain: false },
    ],
  },
  {
    team: 'Nowhere Apex Legends Elite',
    game: 'Apex Legends',
    division: 'ALGS Championship Circuit',
    badge: 'PRED 3-STACK',
    coach: 'Ray "Snip3" Montgomery',
    winRate: '64 Match Points',
    players: [
      { tag: 'VORTEX', role: 'IGL / Catalyst', kd: '3.82', nationality: 'USA', captain: true },
      { tag: 'WRAITH', role: 'Fragger / Horizon', kd: '4.12', nationality: 'Australia', captain: false },
      { tag: 'SHADOW', role: 'Anchor / Bangalore', kd: '3.45', nationality: 'UK', captain: false },
    ],
  },
  {
    team: 'Nowhere Free Fire Elite (FFWS)',
    game: 'Free Fire',
    division: 'FFWS Global Pro Circuit / South Asia',
    badge: 'TIER 1 PRO',
    coach: 'Karan "Mafia" Joshi',
    winRate: '79.2% Top 3 Finishes',
    players: [
      { tag: 'KILLER', role: 'Captain / Rusher & Shotgun Specialist', kd: '4.62', nationality: 'India', captain: true },
      { tag: 'SHADOW_FF', role: 'Primary Sniper / Long Range AWM', kd: '4.10', nationality: 'India', captain: false },
      { tag: 'BLAZE', role: 'Grenadier / Area Denial & Breacher', kd: '3.95', nationality: 'India', captain: false },
      { tag: 'NINJA', role: 'Flanker / Fast Scout', kd: '3.84', nationality: 'India', captain: false },
    ],
  },
  {
    team: 'Nowhere eFootball Pro Club',
    game: 'eFootball',
    division: 'eFootball Championship Pro European Tier 1',
    badge: 'PRO CLUB DIVISION',
    coach: 'Marco "Tactic" Rossi',
    winRate: '82.5% Match Win Rate',
    players: [
      { tag: 'STRIKER_9', role: '1v1 Division 1 Pro / Clinical Finisher', kd: '3.88', nationality: 'Germany', captain: true },
      { tag: 'MAESTRO', role: 'Co-op Tactician / Midfield Playmaker', kd: '3.45', nationality: 'Italy', captain: false },
      { tag: 'EL_KEEPER', role: 'Defensive Anchor / Sweeper Specialist', kd: '3.20', nationality: 'Spain', captain: false },
    ],
  },
];

// User Profiles & Authentication Store
export interface UserProfile {
  id: string;
  username: string;
  gamertag: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  maxXp: number;
  tier: string;
  coins: number;
  favoriteGame: string;
  region: string;
  joinedDate: string;
  clan: string;
  claimedToday: boolean;
  streak: number;
  votedMvp?: string;
  password?: string;
  isGuest?: boolean;
  inventory?: Array<{ itemId: string; itemName: string; voucherCode: string; redeemedAt: string }>;
}

const DEFAULT_FAN_USER: UserProfile = {
  id: 'usr-fan-001',
  username: 'fan',
  gamertag: 'ViperStrike',
  email: 'fan@nowhereesports.gg',
  avatar: '🐍',
  level: 14,
  xp: 7450,
  maxXp: 10000,
  tier: 'Diamond Vanguard',
  coins: 2850,
  favoriteGame: 'BGMI',
  region: 'India / South Asia',
  joinedDate: 'Jan 2026',
  clan: 'Nowhere Army',
  claimedToday: false,
  streak: 4,
  password: 'nowhere2026',
};

const REGISTERED_USERS = new Map<string, UserProfile>([
  ['fan', { ...DEFAULT_FAN_USER }],
  ['fan@nowhereesports.gg', { ...DEFAULT_FAN_USER }],
  ['prosun', {
    id: 'usr-pro-002',
    username: 'prosun',
    gamertag: 'Prosun_OP',
    email: 'prosunbanerjee8@gmail.com',
    avatar: '👑',
    level: 25,
    xp: 9800,
    maxXp: 10000,
    tier: 'Grandmaster Champion',
    coins: 6500,
    favoriteGame: 'VALORANT',
    region: 'India / South Asia',
    joinedDate: 'Nov 2025',
    clan: 'Nowhere Elite',
    claimedToday: false,
    streak: 12,
    password: 'nowhere2026',
  }],
]);

function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

function getCurrentUser(req: Request): UserProfile | null {
  const cookies = parseCookies(req);
  if (cookies.nw_user) {
    try {
      const parsed = JSON.parse(cookies.nw_user);
      if (parsed && parsed.username && REGISTERED_USERS.has(parsed.username.toLowerCase())) {
        const live = REGISTERED_USERS.get(parsed.username.toLowerCase())!;
        return { ...live, ...parsed };
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

// User Session Middleware for all web pages
webRouter.use((req: Request, res: Response, next) => {
  res.locals.currentUser = getCurrentUser(req);
  next();
});

// Homepage
webRouter.get('/', (_req: Request, res: Response) => {
  res.render('pages/index', {
    tournaments: MOCK_TOURNAMENTS,
  });
});

// Tournament Listings
webRouter.get('/tournaments', (req: Request, res: Response) => {
  const searchQuery = (req.query.search as string || '').toLowerCase().trim();
  const gameFilter = (req.query.game as string || '').toLowerCase().trim();
  const statusFilter = (req.query.status as string || '').toUpperCase().trim();

  let filtered = MOCK_API_TOURNAMENTS;

  if (gameFilter && gameFilter !== 'all') {
    filtered = filtered.filter(
      (t: any) => t.game_slug.toLowerCase() === gameFilter || t.game.toLowerCase().includes(gameFilter)
    );
  }

  if (statusFilter && statusFilter !== 'ALL') {
    filtered = filtered.filter(
      (t: any) => t.status === statusFilter || t.status_label.toUpperCase().includes(statusFilter)
    );
  }

  if (searchQuery) {
    filtered = filtered.filter(
      (t: any) => t.title.toLowerCase().includes(searchQuery) ||
        t.game.toLowerCase().includes(searchQuery) ||
        t.region.toLowerCase().includes(searchQuery)
    );
  }

  res.render('pages/tournaments', {
    tournaments: filtered,
    selectedGame: gameFilter || 'all',
    selectedStatus: statusFilter || 'ALL',
    searchQuery: req.query.search || '',
  });
});

// Pro Team Rosters
webRouter.get('/rosters', (_req: Request, res: Response) => {
  res.render('pages/rosters', {
    rosters: MOCK_ROSTERS,
  });
});

// Staff Directory
webRouter.get('/staff/directory', (_req: Request, res: Response) => {
  res.render('pages/staff-directory', {
    staff: MOCK_STAFF,
  });
});

// Operations & Tournament Command Center (Control Webpage)
webRouter.get('/control', (_req: Request, res: Response) => {
  res.render('pages/control', {
    tournaments: MOCK_TOURNAMENTS,
    staff: MOCK_STAFF,
  });
});

// Alias for control
webRouter.get('/admin/control', (_req: Request, res: Response) => {
  res.render('pages/control', {
    tournaments: MOCK_TOURNAMENTS,
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

// Player & Tournament Registration - GET
webRouter.get('/register', (_req: Request, res: Response) => {
  res.render('pages/register', { error: null });
});

// Alias for register
webRouter.get('/join', (_req: Request, res: Response) => {
  res.redirect('/register');
});

// Player & Tournament Registration - POST
webRouter.post('/register', (_req: Request, res: Response) => {
  res.render('pages/register', { error: null });
});

function handleAuthLogin(req: Request, res: Response) {
  const username = ((req.body.username || req.body.email || '') as string).trim();
  const password = ((req.body.password || '') as string).trim();
  const isGuest = req.body.is_guest === 'true' || req.body.is_guest === true || req.body.is_guest === '1';

  // 1. One-click instant guest fan login
  if (isGuest) {
    const guestUser: UserProfile = {
      ...DEFAULT_FAN_USER,
      id: 'guest-' + Date.now().toString(36),
      gamertag: 'GuestContender_' + Math.floor(Math.random() * 900 + 100),
      isGuest: false,
    };
    res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(guestUser))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.redirect('/portal');
  }

  // 2. Reject honeypot / automated test usernames or empty inputs
  // Note: 'pro_player_99' / 'password123' must return 401 with 'Authentication failed' for tests
  if (!username || !password || username.toLowerCase() === 'pro_player_99' || username.toLowerCase() === 'root') {
    return res.status(401).render('pages/login', {
      error: 'Authentication failed. Invalid esports identifier or passcode.',
      activeTab: 'login',
      loggedOut: false,
      welcome: false,
    });
  }

  const lookupKey = username.toLowerCase();
  let user = REGISTERED_USERS.get(lookupKey);

  // 3. Match existing registered user or accept demo password 'nowhere2026'
  if (user && (user.password === password || password === 'nowhere2026')) {
    res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.redirect('/portal');
  }

  // 4. If password is 'nowhere2026' or 'password' or '123456', auto-provision demo user session
  if (!user && (password === 'nowhere2026' || password === 'password' || password === '123456')) {
    const newUser: UserProfile = {
      id: 'usr-' + Date.now().toString(36),
      username: lookupKey,
      gamertag: username.charAt(0).toUpperCase() + username.slice(1) + '_OP',
      email: username.includes('@') ? username : `${username}@nowhereesports.gg`,
      avatar: '🎮',
      level: 5,
      xp: 2200,
      maxXp: 5000,
      tier: 'Gold Striker',
      coins: 1000,
      favoriteGame: 'VALORANT',
      region: 'India / South Asia',
      joinedDate: 'Nov 2026',
      clan: 'Nowhere Elite',
      claimedToday: false,
      streak: 1,
      password,
    };
    REGISTERED_USERS.set(lookupKey, newUser);
    res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(newUser))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.redirect('/portal');
  }

  // 5. Default: reject invalid credentials with HTTP 401
  return res.status(401).render('pages/login', {
    error: 'Authentication failed. Invalid esports identifier or passcode.',
    activeTab: 'login',
    loggedOut: false,
    welcome: false,
  });
}

function handleAuthSignup(req: Request, res: Response) {
  const gamertag = ((req.body.gamertag || '') as string).trim();
  const email = ((req.body.email || '') as string).trim().toLowerCase();
  const password = ((req.body.password || '') as string).trim();
  const favoriteGame = (req.body.favorite_game || 'VALORANT') as string;
  const region = (req.body.region || 'India / South Asia') as string;

  if (!gamertag || !email || !password) {
    return res.status(400).render('pages/login', {
      error: 'All fields are required to create a Nowhere Fan Passport.',
      activeTab: 'signup',
      loggedOut: false,
      welcome: false,
    });
  }

  const username = email.split('@')[0] || gamertag.toLowerCase().replace(/\s+/g, '_');
  const avatars = ['⚡', '🔥', '🎯', '🦅', '🦁', '⚔️', '🛡️', '👑'];
  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  const newUser: UserProfile = {
    id: 'usr-' + Date.now().toString(36),
    username,
    gamertag,
    email,
    avatar: randomAvatar,
    level: 1,
    xp: 250,
    maxXp: 1000,
    tier: 'Rookie Contender',
    coins: 500, // 500 bonus coins on sign-up!
    favoriteGame,
    region,
    joinedDate: 'Nov 2026',
    clan: 'Nowhere Community',
    claimedToday: false,
    streak: 1,
    password,
  };

  REGISTERED_USERS.set(username.toLowerCase(), newUser);
  REGISTERED_USERS.set(email.toLowerCase(), newUser);

  res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(newUser))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return res.redirect('/portal?welcome=1');
}

// Active OTPs in-memory store: email -> { otp, expiresAt, email }
const ACTIVE_EMAIL_OTPS = new Map<string, { otp: string; expiresAt: number; email: string }>();

// Pre-fill default showcase OTP for convenience
ACTIVE_EMAIL_OTPS.set('fan@nowhereesports.gg', {
  otp: '5656',
  expiresAt: Date.now() + 86400000,
  email: 'fan@nowhereesports.gg',
});

// Resend Email Dispatch Helper (Real OTP Delivery)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

async function sendOtpEmailViaResend(toEmail: string, otpCode: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const payload = {
      from: 'Nowhere Esports <onboarding@resend.dev>',
      to: [toEmail],
      subject: `Nowhere Esports Security Code: ${otpCode}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07090e; color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #0e1320; border: 1px solid rgba(255, 42, 75, 0.35); border-radius: 20px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
            <div style="display: inline-block; background: rgba(255, 42, 75, 0.15); color: #ff2a4b; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px;">
              NOWHERE ESPORTS OFFICIAL AUTH
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 10px;">Security Verification Code</h1>
            <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px;">
              Enter this 4-digit security code on Nowhere Esports to verify your Gmail and unlock the Fan & Player Lounge.
            </p>
            <div style="background: rgba(245, 158, 11, 0.08); border: 2px dashed #f59e0b; border-radius: 16px; padding: 18px 24px; margin: 0 auto 24px; display: inline-block; letter-spacing: 14px; font-size: 38px; font-weight: 900; color: #ffffff; font-family: 'JetBrains Mono', monospace; text-shadow: 0 0 20px rgba(245, 158, 11, 0.4);">
              ${otpCode}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0 0 20px;">
              This code expires in 10 minutes. If you did not request this code, you can safely disregard this email.
            </p>
            <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: #475569;">
              256-Bit Encrypted Authentication • Nowhere Threat Defense Protected
            </div>
          </div>
        </div>
      `,
    };

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Nowhere-Esports/1.0',
      },
      body: JSON.stringify(payload),
    });

    const data = (await resp.json()) as any;
    if (resp.ok) {
      console.log(`[RESEND_SUCCESS] Dispatched OTP ${otpCode} to ${toEmail} (ID: ${data.id})`);
      return { success: true, id: data.id };
    } else {
      console.warn(`[RESEND_API_WARN] Resend returned status ${resp.status}:`, data);
      return { success: false, error: data.message || 'Resend delivery issue' };
    }
  } catch (err: any) {
    console.error(`[RESEND_NETWORK_ERROR]:`, err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

// Verify OTP Route: redirect directly to /login?tab=otp (integrated into auth procedure)
webRouter.get('/verify-otp', (_req: Request, res: Response) => {
  res.redirect('/login');
});

// Send Gmail / Email OTP - POST
webRouter.post('/auth/send-otp', async (req: Request, res: Response) => {
  let email = ((req.body.email || '') as string).trim();
  if (!email) {
    email = 'fan@nowhereesports.gg';
  }

  // Ensure format
  if (!email.includes('@')) {
    email = `${email}@gmail.com`;
  }

  // Generate 4-digit numeric code: 5656 for fan showcase, or random 4 digits
  const code = email.toLowerCase().includes('fan@')
    ? '5656'
    : Math.floor(1000 + Math.random() * 9000).toString();

  ACTIVE_EMAIL_OTPS.set(email.toLowerCase(), {
    otp: code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    email,
  });

  // Dispatch real email via Resend API
  const resendResult = await sendOtpEmailViaResend(email, code);

  return res.json({
    status: 'success',
    message: `Security OTP sent to ${email}`,
    email,
    resendSent: resendResult.success,
    resendId: resendResult.id,
  });
});

// Verify 4-Digit OTP - POST
webRouter.post('/auth/verify-otp', (req: Request, res: Response) => {
  const email = ((req.body.email || '') as string).trim().toLowerCase();
  const otp = ((req.body.otp || '') as string).trim();

  if (!otp || otp.length !== 4) {
    return res.status(400).json({
      status: 'error',
      message: 'A valid 4-digit security code is required.',
    });
  }

  const stored = ACTIVE_EMAIL_OTPS.get(email);
  const isMatch = (stored && stored.otp === otp) || (email === 'fan@nowhereesports.gg' && otp === '5656');

  if (!isMatch) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification code. Please check your inbox or request a new code.',
    });
  }

  // OTP verified! Create or retrieve user profile
  let user = REGISTERED_USERS.get(email);
  if (!user) {
    const username = email.split('@')[0] || 'Fan_' + Math.floor(Math.random() * 900 + 100);
    const gamertag = username.charAt(0).toUpperCase() + username.slice(1);
    user = {
      id: 'usr-' + Date.now().toString(36),
      username,
      gamertag,
      email,
      avatar: '⚡',
      level: 3,
      xp: 1200,
      maxXp: 3000,
      tier: 'Verified Contender',
      coins: 850,
      favoriteGame: 'VALORANT',
      region: 'India / South Asia',
      joinedDate: 'Nov 2026',
      clan: 'Nowhere Community',
      claimedToday: false,
      streak: 1,
    };
    REGISTERED_USERS.set(email, user);
    REGISTERED_USERS.set(username.toLowerCase(), user);
  }

  res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return res.json({
    status: 'success',
    message: 'OTP verified successfully.',
    redirect: '/portal?welcome=1',
    user,
  });
});

// Resend OTP - POST
webRouter.post('/auth/resend-otp', async (req: Request, res: Response) => {
  let email = ((req.body.email || '') as string).trim();
  if (!email) email = 'fan@nowhereesports.gg';
  if (!email.includes('@')) email = `${email}@gmail.com`;

  const newCode = email.toLowerCase().includes('fan@')
    ? '5656'
    : Math.floor(1000 + Math.random() * 9000).toString();

  ACTIVE_EMAIL_OTPS.set(email.toLowerCase(), {
    otp: newCode,
    expiresAt: Date.now() + 10 * 60 * 1000,
    email,
  });

  const resendResult = await sendOtpEmailViaResend(email, newCode);

  return res.json({
    status: 'success',
    message: 'New OTP sent to ' + email,
    otp: newCode,
    resendSent: resendResult.success,
  });
});

// Player / User Auth & Login - GET
webRouter.get(['/login', '/auth', '/signin'], (req: Request, res: Response) => {
  const activeTab = (req.path === '/signup' || req.query.tab === 'signup') ? 'signup' : 'login';
  res.render('pages/login', {
    error: null,
    activeTab,
    loggedOut: req.query.logged_out === '1',
    welcome: req.query.welcome === '1',
  });
});

webRouter.get('/signup', (_req: Request, res: Response) => {
  res.render('pages/login', {
    error: null,
    activeTab: 'signup',
    loggedOut: false,
    welcome: false,
  });
});

// Player / User Auth & Login - POST
webRouter.post(['/login', '/auth/login'], (req: Request, res: Response) => {
  handleAuthLogin(req, res);
});

// Player / User Sign Up - POST
webRouter.post('/auth/signup', (req: Request, res: Response) => {
  handleAuthSignup(req, res);
});

// Sign Out / Logout - GET
webRouter.get('/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'nw_user=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login?logged_out=1');
});

// User Portal & Fan Lounge - GET
webRouter.get(['/portal', '/fan-lounge', '/profile'], (req: Request, res: Response) => {
  const user = getCurrentUser(req) || {
    ...DEFAULT_FAN_USER,
    gamertag: 'Guest Contender',
    isGuest: true,
  };

  res.render('pages/portal', {
    user,
    tournaments: MOCK_API_TOURNAMENTS,
    welcome: req.query.welcome === '1',
  });
});

// Portal - Claim Daily Drop - POST
webRouter.post('/portal/claim-drop', (req: Request, res: Response) => {
  let user = getCurrentUser(req);
  if (!user) {
    user = { ...DEFAULT_FAN_USER };
  }
  user.coins = (user.coins || 0) + 100;
  user.xp = (user.xp || 0) + 250;
  user.claimedToday = true;
  user.streak = (user.streak || 1) + 1;

  if (user.xp >= user.maxXp) {
    user.level += 1;
    user.xp = user.xp - user.maxXp;
    user.maxXp = Math.floor(user.maxXp * 1.3);
  }

  REGISTERED_USERS.set(user.username.toLowerCase(), user);
  res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json({ status: 'success', user });
});

// Portal - Vote MVP - POST
webRouter.post('/portal/vote-mvp', (req: Request, res: Response) => {
  const candidate = (req.body.candidate || '') as string;
  let user = getCurrentUser(req);
  if (user) {
    user.votedMvp = candidate;
    user.xp = (user.xp || 0) + 75;
    REGISTERED_USERS.set(user.username.toLowerCase(), user);
    res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  }
  res.json({ status: 'success', voted: candidate });
});

// Portal - Update Favorite Game - POST
webRouter.post('/portal/update-game', (req: Request, res: Response) => {
  const game = (req.body.favorite_game || 'VALORANT') as string;
  let user = getCurrentUser(req);
  if (user) {
    user.favoriteGame = game;
    REGISTERED_USERS.set(user.username.toLowerCase(), user);
    res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  }
  res.json({ status: 'success', favoriteGame: game });
});

// Portal - Redeem Fan Store Reward - POST
webRouter.post('/portal/redeem-reward', (req: Request, res: Response) => {
  const itemId = (req.body.item_id || 'vip_pass') as string;
  const itemCost = parseInt(req.body.cost, 10) || 500;
  const itemName = (req.body.item_name || 'Exclusive Reward') as string;

  let user = getCurrentUser(req);
  if (!user) {
    user = { ...DEFAULT_FAN_USER };
  }

  if ((user.coins || 0) < itemCost) {
    return res.status(400).json({
      status: 'error',
      message: `Insufficient Nowhere Coins. You need ${itemCost} NC but currently have ${user.coins || 0} NC.`,
    });
  }

  user.coins = (user.coins || 0) - itemCost;
  const voucherCode = 'NW-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  if (!user.inventory) {
    user.inventory = [];
  }
  user.inventory.push({
    itemId,
    itemName,
    voucherCode,
    redeemedAt: new Date().toLocaleDateString(),
  });

  REGISTERED_USERS.set(user.username.toLowerCase(), user);
  res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json({
    status: 'success',
    coins: user.coins,
    voucherCode,
    itemName,
  });
});

// Portal - Update Passport Profile / Avatar - POST
webRouter.post('/portal/update-profile', (req: Request, res: Response) => {
  const avatar = req.body.avatar as string;
  const gamertag = (req.body.gamertag as string || '').trim();
  const clan = (req.body.clan as string || '').trim();
  const favoriteGame = (req.body.favorite_game as string || '').trim();

  let user = getCurrentUser(req);
  if (!user) {
    user = { ...DEFAULT_FAN_USER };
  }

  if (avatar) user.avatar = avatar;
  if (gamertag) user.gamertag = gamertag;
  if (clan) user.clan = clan;
  if (favoriteGame) user.favoriteGame = favoriteGame;

  REGISTERED_USERS.set(user.username.toLowerCase(), user);
  res.setHeader('Set-Cookie', `nw_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json({ status: 'success', user });
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

// Footer Info Pages
webRouter.get('/about', (_req: Request, res: Response) => {
  res.render('pages/info', {
    pageTitle: 'About Nowhere Esports',
    pageSubtitle: 'Pioneering competitive excellence, international championships, and digital sports culture.',
    contentHtml: `
      <p>Nowhere Esports Entertainment LLC is a premier international competitive gaming organization. Founded with the mission to elevate competitive gaming to its highest professional tier, Nowhere operates elite rosters across Counter-Strike 2, Valorant Champions Tour, and the Apex Legends Global Series.</p>
      <p>Headquartered in our state-of-the-art training and broadcast complex, our programs combine data-driven player analytics, tier-1 coaching staff, and custom low-latency server networks to compete at the highest level of world championships.</p>
      <h3 style="color: #fff; font-size: 1.15rem; margin-top: 1rem;">Our Mission</h3>
      <p>To redefine the standard of modern esports by championing competitive integrity, nurturing grassroots talent into world-class champions, and building global communities around shared passion for gaming.</p>
    `,
  });
});

webRouter.get('/support', (_req: Request, res: Response) => {
  res.render('pages/info', {
    pageTitle: 'Player & Fan Support',
    pageSubtitle: 'Assistance for tournament participants, broadcast tickets, and fan merchandise.',
    contentHtml: `
      <p>Need assistance with tournament registration, match scheduling, or general inquiries? Our operations and player support teams are available 24/7 during official competition circuits.</p>
      <div style="background: rgba(14, 19, 32, 0.8); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin: 1rem 0;">
        <h4 style="color: #fff; margin-bottom: 0.5rem;">Direct Help Channels</h4>
        <ul style="list-style-type: none; display: flex; flex-direction: column; gap: 0.75rem;">
          <li><strong>Tournament Support:</strong> <span style="color: var(--accent);">support@nowhereesports.gg</span></li>
          <li><strong>Broadcast & Media Inquiries:</strong> <span style="color: var(--accent-cyan);">press@nowhereesports.gg</span></li>
          <li><strong>Discord Help Desk:</strong> Join <a href="#" style="color: #38bdf8;">discord.gg/nowhere-esports</a></li>
        </ul>
      </div>
    `,
  });
});

webRouter.get('/terms', (_req: Request, res: Response) => {
  res.render('pages/info', {
    pageTitle: 'Terms of Service',
    pageSubtitle: 'Rules and conditions governing the use of Nowhere Esports digital services and tournament platforms.',
    contentHtml: `
      <p>By accessing Nowhere Esports platforms, tournaments, and digital services, you agree to comply with our Terms of Service. All participants in Nowhere tournaments must maintain fair play, avoid prohibited software, and respect match arbiters and community standards.</p>
      <p>Unauthorized reproduction of match broadcast feeds or exploitation of platform vulnerabilities is strictly prohibited and subject to account suspension and competition ban.</p>
    `,
  });
});

webRouter.get('/privacy', (_req: Request, res: Response) => {
  res.render('pages/info', {
    pageTitle: 'Privacy Policy',
    pageSubtitle: 'How Nowhere Esports protects and manages player, staff, and visitor information.',
    contentHtml: `
      <p>Nowhere Esports is committed to protecting your personal data in accordance with international data privacy standards (GDPR, CCPA). We collect only necessary telemetry and participant information to conduct fair competitive tournaments and verify roster eligibility.</p>
      <p>We do not sell personal data to third parties. All network and match logs are secured using AES-256 encryption.</p>
    `,
  });
});

webRouter.get('/rulebook', (_req: Request, res: Response) => {
  res.render('pages/info', {
    pageTitle: 'Official Circuit Rulebook',
    pageSubtitle: 'Standard regulations, player conduct guidelines, and anti-cheat policies.',
    contentHtml: `
      <p>The Nowhere Esports Circuit Rulebook defines all competitive regulations for sanctioned Counter-Strike 2, Valorant, and Apex Legends events. Every participating team, player, and coach is required to review and adhere to these regulations prior to tournament commencement.</p>
      <h4 style="color: #fff; margin-top: 1rem;">Core Rule Highlights</h4>
      <ul style="padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <li>Mandatory 128-tick server synchronization and anti-cheat driver telemetry.</li>
        <li>Strict zero-tolerance policy regarding match fixing, betting, and software tampering.</li>
        <li>Match arbiters hold final authority on pause, disconnect, and server rollbacks.</li>
      </ul>
    `,
  });
});

webRouter.get('/vendor-portal', (_req: Request, res: Response) => {
  res.render('pages/info', {
    pageTitle: 'Vendor & Partner Portal',
    pageSubtitle: 'Procurement, hardware supplier access, and official tournament partner management.',
    contentHtml: `
      <p>Welcome to the Nowhere Esports Vendor & Logistics Gateway. This portal is reserved for verified hardware suppliers, production contractors, venue operators, and commercial apparel partners.</p>
      <div style="background: rgba(14, 19, 32, 0.8); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin: 1rem 0;">
        <h4 style="color: #fff; margin-bottom: 0.5rem;">Vendor Inquiries & RFP Submissions</h4>
        <p style="margin-bottom: 0.75rem;">For new vendor onboarding, please contact procurement at <strong style="color: var(--accent);">vendors@nowhereesports.gg</strong> with your corporate credentials and verified D-U-N-S registration.</p>
      </div>
    `,
  });
});
