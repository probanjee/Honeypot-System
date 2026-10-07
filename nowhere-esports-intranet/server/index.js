const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const config = require('./config/config');
const connectDB = require('./config/db');
require('./config/passport')(passport);

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const dashboardRoutes    = require('./routes/dashboard.routes');
const matchRoutes        = require('./routes/matches.routes');
const announcementRoutes = require('./routes/announcements.routes');
const honeypotRoutes     = require('./routes/honeypot.routes');           // ← NEW

const { honeypotMiddleware } = require('./middleware/honeypot.middleware'); // ← NEW

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());

// ── Honeypot detection (runs BEFORE any route — monitors every request) ────────
// Skip the SSE stream itself and static assets to avoid infinite loops
app.use((req, res, next) => {
    if (req.path.startsWith('/honeypot') || req.path.startsWith('/src/')) return next();
    honeypotMiddleware(req, res, next);
});

// ── Static files ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Root redirect ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/src/pages/login/index.html');
});

// ── Honeypot routes (open — no auth required for SSE stream) ─────────────────
app.use('/honeypot', honeypotRoutes);

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/matches', matchRoutes);
app.use('/announcements', announcementRoutes);

// ── Health Routes ──────────────────────────────────────────────────────────────
app.get('/health/database', async (req, res) => {
    try {
        const MongoDBAdapter = require('./adapters/database/mongodb.adapter');
        const SupabaseAdapter = require('./adapters/database/supabase.adapter');

        const mongo = new MongoDBAdapter();
        const supabase = new SupabaseAdapter();

        const mongoStatus = await mongo.status();
        const supabaseStatus = await supabase.status();
        
        const activeProvider = process.env.USE_SUPABASE === 'true' ? 'supabase' : 'mongodb';
        
        console.log(`[Healthcheck] Database status checked. Active Provider: ${activeProvider}. MongoDB: ${mongoStatus.status}, Supabase: ${supabaseStatus.status}`);

        res.json({
            status: 'ok',
            active_provider: activeProvider,
            mongodb: mongoStatus,
            supabase: supabaseStatus
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ── Connect to DB and Start ────────────────────────────────────────────────────
connectDB().then(() => {
    app.listen(config.port, () => {
        console.log(`✅  Nowhere Esports Intranet running → http://localhost:${config.port}`);
        const activeProvider = process.env.USE_SUPABASE === 'true' ? 'Supabase' : 'MongoDB';
        console.log(`🗄️  Active Database Provider: ${activeProvider}`);
        console.log(`🛡️  Honeypot SSE stream → http://localhost:${config.port}/honeypot/events`);
    });
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
});
