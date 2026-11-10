import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Multi-environment path discovery for views and static assets (Vercel serverless + local)
let viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
  const candidates = [
    path.join(process.cwd(), 'apps', 'admin-portal', 'src', 'views'),
    path.join(process.cwd(), 'src', 'views'),
    path.join(process.cwd(), 'views')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { viewsDir = c; break; }
  }
}
app.set('view engine', 'ejs');
app.set('views', viewsDir);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const staticCandidates = [
  path.join(__dirname, '../public'),
  path.join(__dirname, 'public'),
  path.join(process.cwd(), 'apps', 'admin-portal', 'public'),
  path.join(process.cwd(), 'public')
];
for (const s of staticCandidates) {
  if (fs.existsSync(s)) {
    app.use(express.static(s));
  }
}

// In-Memory Data Store
let totalProbesSent = 18;

let tournaments = [
  {
    id: "TRN-2026-CS-01",
    title: "Nowhere CS2 Major Invitational",
    game: "Counter-Strike 2",
    region: "EU West / Cologne",
    prize_pool: "$1,000,000 USD",
    format: "Swiss Stage -> Single Elimination",
    status: "LIVE",
    division: "Tier 1 International"
  },
  {
    id: "TRN-2026-VAL-02",
    title: "Nowhere Masters Champions Tour",
    game: "Valorant Champions",
    region: "NA East / Dallas",
    prize_pool: "$750,000 USD",
    format: "Double Elimination",
    status: "UPCOMING",
    division: "VCT Global Circuit"
  },
  {
    id: "TRN-2026-APX-03",
    title: "Nowhere Apex Global Showdown",
    game: "Apex Legends",
    region: "Asia-Pacific / Tokyo",
    prize_pool: "$500,000 USD",
    format: "Match Point Finals (60 Pts)",
    status: "LIVE",
    division: "ALGS Partner Circuit"
  }
];

let servers = [
  {
    id: "NODE-FRA-01",
    name: "Frankfurt CS2 Dedicated Cluster #01",
    location: "Frankfurt, Germany",
    game: "Counter-Strike 2",
    ip: "194.154.78.12:27015",
    tickrate: "128.0 Hz",
    ping: "9ms",
    cpuLoad: "1.42 / 4.00",
    cpuPercent: 35,
    players: "10 / 10",
    status: "ONLINE"
  },
  {
    id: "NODE-DAL-02",
    name: "Dallas Valorant Match Core #02",
    location: "Dallas, TX, USA",
    game: "Valorant Champions",
    ip: "104.200.15.89:27016",
    tickrate: "128.0 Hz",
    ping: "14ms",
    cpuLoad: "2.10 / 4.00",
    cpuPercent: 52,
    players: "10 / 10",
    status: "ONLINE"
  },
  {
    id: "NODE-NRT-03",
    name: "Tokyo Apex Compute Node #03",
    location: "Tokyo, Japan",
    game: "Apex Legends",
    ip: "133.242.18.44:27017",
    tickrate: "128.0 Hz",
    ping: "18ms",
    cpuLoad: "3.45 / 4.00",
    cpuPercent: 86,
    players: "60 / 60",
    status: "ONLINE"
  },
  {
    id: "NODE-GRU-04",
    name: "Sao Paulo Regional Node #04",
    location: "Sao Paulo, Brazil",
    game: "Counter-Strike 2",
    ip: "177.18.99.120:27018",
    tickrate: "128.0 Hz",
    ping: "22ms",
    cpuLoad: "0.85 / 4.00",
    cpuPercent: 21,
    players: "10 / 10",
    status: "ONLINE"
  }
];

const staff = [
  { name: "Marcus 'Vanguard' Kane", role: "Head of Esports & Tournament Operations", department: "Executive Operations", clearance: "LEVEL 5 (ROOT)", badge: "NW-EXEC-001" },
  { name: "Elena 'Cipher' Rostova", role: "Principal Anti-Cheat & Infrastructure Engineer", department: "Server Engineering", clearance: "LEVEL 4 (SYSADMIN)", badge: "NW-ENG-042" },
  { name: "Darius 'Apex' Thorne", role: "Tournament Director - CS2 Division", department: "Match Operations", clearance: "LEVEL 3 (REFEREE)", badge: "NW-OPS-118" },
  { name: "Sarah 'Nova' Lin", role: "Lead Broadcast & Production Engineer", department: "Broadcast Ops", clearance: "LEVEL 3 (BROADCAST)", badge: "NW-BC-029" },
  { name: "Tomasz 'Falcon' Novak", role: "Network Operations & Bare-Metal Tech", department: "NOC Infrastructure", clearance: "LEVEL 4 (INFRA)", badge: "NW-NOC-088" }
];

let logs = [
  { time: "2026-11-08 11:32:04", user: "SYS_ADMIN", action: "128-Tick Clock Sync", target: "NODE-FRA-01", ip: "10.0.4.12", result: "SUCCESS" },
  { time: "2026-11-08 11:28:19", user: "SYS_ADMIN", action: "Swiss Bracket Lock", target: "TRN-2026-CS-01", ip: "10.0.4.12", result: "SUCCESS" },
  { time: "2026-11-08 11:15:44", user: "SYS_ADMIN", action: "Synthetic Attack Probe", target: "DECOY_HONEYPOT:3000", ip: "127.0.0.1", result: "SUCCESS" },
  { time: "2026-11-08 10:55:01", user: "E_ROSTOVA", action: "Kernel Anti-Cheat Patch", target: "NODE-DAL-02", ip: "10.0.4.88", result: "SUCCESS" },
  { time: "2026-11-08 10:41:22", user: "GUEST_UNKNOWN", action: "Unauthorized Access Probe", target: "/admin/login", ip: "198.51.100.82", result: "TRAPPED" }
];

// Routes

// 1. Command Deck Overview
app.get('/', (req, res) => {
  res.render('pages/index', {
    stats: {
      activeTournaments: tournaments.filter(t => t.status === 'LIVE').length,
      totalTournaments: tournaments.length,
      onlineServers: servers.filter(s => s.status === 'ONLINE').length,
      totalServers: servers.length,
      probesSent: totalProbesSent
    },
    tournaments,
    servers
  });
});

// 2. Tournaments Controller
app.get('/tournaments', (req, res) => {
  res.render('pages/tournaments', { tournaments });
});

app.post('/tournaments', (req, res) => {
  const { title, game, region, prize_pool, format } = req.body;
  const newId = `TRN-2026-${game.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
  tournaments.push({
    id: newId,
    title: title || 'New Tournament',
    game: game || 'Counter-Strike 2',
    region: region || 'Global',
    prize_pool: prize_pool || '$250,000 USD',
    format: format || 'Single Elimination',
    status: 'UPCOMING',
    division: 'Pro Division'
  });
  logs.unshift({
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: 'SYS_ADMIN',
    action: `Registered Tournament ${newId}`,
    target: title,
    ip: '127.0.0.1',
    result: 'SUCCESS'
  });
  res.redirect('/tournaments');
});

app.post('/tournaments/:id/delete', (req, res) => {
  const { id } = req.params;
  tournaments = tournaments.filter(t => t.id !== id);
  res.redirect('/tournaments');
});

app.post('/api/tournaments/:id/toggle', (req, res) => {
  const { id } = req.params;
  const t = tournaments.find(item => item.id === id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.status = t.status === 'LIVE' ? 'PAUSED' : 'LIVE';
  logs.unshift({
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: 'SYS_ADMIN',
    action: `Toggle Status [${t.status}]`,
    target: id,
    ip: '127.0.0.1',
    result: 'SUCCESS'
  });
  res.json({ success: true, newStatus: t.status });
});

// 3. Match Server Fleet
app.get('/servers', (req, res) => {
  res.render('pages/servers', { servers });
});

app.post('/api/servers/restart', (req, res) => {
  const { serverId } = req.body;
  const server = servers.find(s => s.id === serverId);
  if (server) {
    logs.unshift({
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: 'SYS_ADMIN',
      action: '128-Tick Cycle',
      target: serverId,
      ip: '127.0.0.1',
      result: 'SUCCESS'
    });
  }
  res.json({ success: true, serverId });
});

// 4. Security & Threat Simulator
app.get('/security', (req, res) => {
  res.render('pages/security', { probesSent: totalProbesSent });
});

app.post('/api/security/probe', async (req, res) => {
  const { vector } = req.body;
  totalProbesSent++;

  const intranetBase = process.env.INTRANET_URL || 'https://owhere-esports-portal.vercel.app';
  let targetUrl = `${intranetBase}/api/v1/tournaments`;
  let method = 'GET';
  let headers = { 'User-Agent': 'Nowhere-Admin-Probe-Simulator/1.0' };
  let body = undefined;
  let rule = 'SIG-PROBE-001';
  let severity = 'HIGH';

  if (vector === 'SQL_INJECTION') {
    targetUrl = `${intranetBase}/api/v1/tournaments?search=` + encodeURIComponent("'; DROP TABLE matches;--");
    rule = 'SIG-SQLI-001';
    severity = 'HIGH';
  } else if (vector === 'COMMAND_INJECTION') {
    targetUrl = `${intranetBase}/exec`;
    method = 'POST';
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ cmd: '; cat /etc/passwd && whoami' });
    rule = 'SIG-RCE-001';
    severity = 'CRITICAL';
  } else if (vector === 'PATH_TRAVERSAL') {
    targetUrl = `${intranetBase}/.env`;
    rule = 'SIG-TRAV-001';
    severity = 'MEDIUM';
  } else if (vector === 'BRUTE_FORCE') {
    targetUrl = `${intranetBase}/admin/login`;
    method = 'POST';
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = 'username=admin&password=Password123!';
    rule = 'SIG-AUTH-001';
    severity = 'MEDIUM';
  }

  // Attempt to hit honeypot decoy on port 3000
  try {
    const fetchOptions = { method, headers };
    if (body) fetchOptions.body = body;
    await fetch(targetUrl, fetchOptions);
  } catch (err) {
    // Continue even if port 3000 is slow
  }

  logs.unshift({
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: 'SYS_ADMIN',
    action: `Synthetic Probe [${vector}]`,
    target: targetUrl,
    ip: '127.0.0.1',
    result: 'CAPTURED'
  });

  res.json({
    success: true,
    totalProbes: totalProbesSent,
    vector,
    rule,
    severity,
    eventId: `evt-${Date.now()}`
  });
});

// 5. Personnel & Access
app.get('/personnel', (req, res) => {
  res.render('pages/personnel', { staff });
});

// 6. Audit Logs
app.get('/logs', (req, res) => {
  res.render('pages/logs', { logs });
});

// Health API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'nowhere-admin-portal',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

export default app;

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NOWHERE_ADMIN_PORTAL] Dedicated Admin Operations Portal live on http://localhost:${PORT}`);
    console.log(`[NOWHERE_ADMIN_PORTAL] Linked to Public Site: http://localhost:3000`);
    console.log(`[NOWHERE_ADMIN_PORTAL] Linked to VIGILANCE SOC: http://localhost:5173`);
  });
}

