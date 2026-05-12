/**
 * seed.js – Populate database with demo data
 * Usage: node scripts/seed.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../server/models/User.model');
const Match = require('../server/models/Match.model');
const Announcement = require('../server/models/Announcement.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nowhere-esports';

const USERS = [
  { email: 'admin@nowhere.gg',    password: 'Admin@123',  name: 'Admin',        role: 'admin',  team: 'Staff',    isVerified: true },
  { email: 'coach@nowhere.gg',    password: 'Coach@123',  name: 'Pixel',        role: 'coach',  team: 'CS2-A',    isVerified: true },
  { email: 'shadow@nowhere.gg',   password: 'Player@123', name: 'ShadowByte',   role: 'player', team: 'CS2-A',    isVerified: true },
  { email: 'nullvoid@nowhere.gg', password: 'Player@123', name: 'NullVoid',     role: 'player', team: 'CS2-A',    isVerified: true },
  { email: 'glitch@nowhere.gg',   password: 'Player@123', name: 'GlitchX',      role: 'player', team: 'CS2-A',    isVerified: true },
  { email: 'packet@nowhere.gg',   password: 'Player@123', name: 'PacketLoss',   role: 'player', team: 'CS2-A',    isVerified: true },
  { email: 'rootkit@nowhere.gg',  password: 'Player@123', name: 'RootKit',      role: 'player', team: 'CS2-A',    isVerified: true },
  { email: 'vortex@nowhere.gg',   password: 'Player@123', name: 'VortexX',      role: 'player', team: 'Valorant', isVerified: true },
  { email: 'zero@nowhere.gg',     password: 'Player@123', name: 'ZeroHour',     role: 'player', team: 'Valorant', isVerified: true },
  { email: 'staff@nowhere.gg',    password: 'Staff@123',  name: 'Team Manager', role: 'staff',  team: 'Staff',    isVerified: true },
];

const MATCHES = [
  { gameTitle: 'CS2',      team1: 'NW Esports', team2: 'Team Alpha',   startTime: new Date(Date.now() - 3600000),     status: 'live',      score: { team1: 14, team2: 7 },  streamUrl: 'https://twitch.tv/nwesports' },
  { gameTitle: 'Valorant', team1: 'NW Esports', team2: 'Phoenix Corp', startTime: new Date(Date.now() + 86400000),    status: 'upcoming',  score: null },
  { gameTitle: 'BGMI',     team1: 'NW Esports', team2: 'Spectral',     startTime: new Date(Date.now() + 2 * 86400000), status: 'upcoming', score: null },
  { gameTitle: 'CS2',      team1: 'NW Esports', team2: 'Shadow5',      startTime: new Date(Date.now() - 2 * 86400000), status: 'completed', score: { team1: 16, team2: 9 } },
  { gameTitle: 'Valorant', team1: 'NW Esports', team2: 'Infinity',     startTime: new Date(Date.now() - 4 * 86400000), status: 'completed', score: { team1: 13, team2: 6 } },
];

const ANNOUNCEMENTS = [
  { title: '🏆 Regional Finals – NW Qualifies!', content: 'We are thrilled to announce that Nowhere Esports CS2 team has qualified for the Regional Finals 2026. Match details will be shared soon.', priority: 'urgent', pinned: true },
  { title: '📋 New Code of Conduct Policy',      content: 'Please review the updated Code of Conduct document in the HR Portal. All players and staff must sign acknowledgment by May 15.', priority: 'warning', pinned: false },
  { title: '🎯 Scrim Schedule Updated',           content: 'Scrim schedule for next week has been updated. Check the Schedule page for details. All mandatory scrims must be attended.', priority: 'info', pinned: false },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Match.deleteMany({});
  await Announcement.deleteMany({});

  const users = await Promise.all(
    USERS.map(async u => ({
      ...u,
      passwordHash: await bcrypt.hash(u.password, 10),
    }))
  );
  await User.insertMany(users);
  console.log(`✅  Seeded ${users.length} users`);

  await Match.insertMany(MATCHES);
  console.log(`✅  Seeded ${MATCHES.length} matches`);

  const admin = await User.findOne({ role: 'admin' });
  const announcements = ANNOUNCEMENTS.map(a => ({ ...a, createdBy: admin._id }));
  await Announcement.insertMany(announcements);
  console.log(`✅  Seeded ${announcements.length} announcements`);

  console.log('\n📝 Demo Credentials:');
  console.log('  Admin:  admin@nowhere.gg / Admin@123');
  console.log('  Player: shadow@nowhere.gg / Player@123');

  await mongoose.disconnect();
  console.log('\n✅  Seed complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
