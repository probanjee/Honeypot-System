import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Activity, Shield, Map, Terminal, BarChart3,
  Sun, Moon, Wifi, AlertTriangle, Server, TrendingUp, Globe,
} from 'lucide-react';

import { useHoneypotStream } from './hooks/useHoneypotStream';
import AttacksTable from './features/attacks/components/AttacksTable';
import AttackTimeline from './features/analytics/components/AttackTimeline';
import SeverityPieChart from './features/analytics/components/SeverityPieChart';
import LogStream from './features/logs/components/LogStream';
import ThreatMap from './features/threats/components/ThreatMap';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext<{ theme: string; toggle: () => void }>({ theme: 'dark', toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'dark');
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>{children}</ThemeCtx.Provider>;
};

const ThemeToggle = () => {
  const { toggle } = useTheme();
  return <button onClick={toggle} className="theme-toggle" aria-label="Toggle theme"><span className="theme-toggle-thumb" /></button>;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, accent, delta }: { label: string; value: string | number; icon: React.ReactNode; accent: 'red' | 'green' | 'blue'; delta?: string }) => (
  <div className={`glass stat-card ${accent} p-6 flex flex-col gap-4`}>
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--text-2)', fontSize: '13px', fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent === 'red' ? 'var(--neon-red)' : accent === 'green' ? 'var(--neon-green)' : 'var(--neon-blue)', opacity: 0.8 }}>
        {icon}
      </span>
    </div>
    <p className={accent === 'red' ? 'neon-red' : accent === 'green' ? 'neon-green' : 'neon-blue'}
       style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{value}</p>
    {delta && <span style={{ color: 'var(--text-3)', fontSize: '12px' }}><TrendingUp size={11} style={{ display: 'inline', marginRight: 4 }} />{delta}</span>}
  </div>
);

// ── Nav Link ──────────────────────────────────────────────────────────────────
const NavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <Link to={to} className={`nav-link ${active ? 'active' : ''}`}>{icon}<span>{label}</span></Link>
  );
};

// ── Pages ─────────────────────────────────────────────────────────────────────
const Dashboard = ({ attacks, connected, stats }: any) => {
  const total     = stats?.total_attacks ?? attacks.length;
  const critical  = stats?.critical_count ?? attacks.filter((a: any) => a.severity >= 90).length;
  const perMin    = stats?.attacks_per_min ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
        <StatCard label="Total Attacks"   value={total.toLocaleString()} icon={<AlertTriangle size={20} />} accent="red"   delta={perMin > 0 ? `${perMin} attacks/min right now` : 'waiting for events'} />
        <StatCard label="Critical Events" value={critical}               icon={<Shield size={20} />}        accent="red"   delta={`${attacks.filter((a:any)=>a.blocked).length} requests blocked`} />
        <StatCard label="Sensor Status"   value={connected ? 'LIVE' : 'OFFLINE'} icon={<Server size={20} />}  accent={connected ? 'green' : 'blue'} delta={connected ? 'Nowhere Esports connected' : 'Start Nowhere server'} />
      </div>

      {/* Connection banner when offline */}
      {!connected && (
        <div style={{
          background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.25)',
          borderRadius: '12px', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong style={{ color: '#ffaa00' }}>Server Offline</strong>
            <span style={{ color: 'var(--text-2)', marginLeft: 8 }}>
              Start the Nowhere Esports server (<code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>node server/index.js</code>) to stream real attack data
            </span>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: '24px', height: '300px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: 600, fontSize: '15px' }}>Live Attack Rate</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>Real-time Historical Data</span>
        </div>
        <AttackTimeline attacks={attacks} />
      </div>

      <div className="glass" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div className="pulse-dot" />
          <h3 style={{ fontWeight: 600, fontSize: '15px' }}>
            {connected ? '🛡 Real-Time Honeypot Feed — Nowhere Esports' : 'Attack Feed'}
          </h3>
          <span style={{
            marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
            color: connected ? 'var(--neon-green)' : '#ffaa00', padding: '2px 10px',
            border: `1px solid ${connected ? 'rgba(0,255,136,0.25)' : 'rgba(255,170,0,0.25)'}`,
            borderRadius: '999px',
            background: connected ? 'rgba(0,255,136,0.07)' : 'rgba(255,170,0,0.07)',
          }}>{connected ? 'NOWHERE LIVE' : 'OFFLINE'}</span>
        </div>
        <AttacksTable attacks={attacks} connected={connected} />
      </div>

      <div className="glass" style={{ padding: '24px', height: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Globe size={18} className="neon-blue" />
          <h3 style={{ fontWeight: 600, fontSize: '15px' }}>Global Threat Map</h3>
        </div>
        <ThreatMap attacks={attacks} />
      </div>

    </div>
  );
};

const AnalyticsPage = ({ stats, attacks }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <div className="glass" style={{ padding: '24px', height: '320px' }}>
      <h3 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '16px' }}>Live Attack Rate Timeline</h3>
      <AttackTimeline attacks={attacks} />
    </div>
    <SeverityPieChart stats={stats} />
  </div>
);

const ThreatsPage = ({ attacks }: any) => <ThreatMap attacks={attacks} />;

const LogsPage = ({ attacks, connected }: any) => (
  <div className="glass" style={{ padding: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <div className="pulse-dot" />
      <h3 style={{ fontWeight: 600, fontSize: '15px' }}>
        {connected ? '🛡 Real Honeypot Logs — Nowhere Esports' : 'Log Stream'}
      </h3>
      <span style={{
        marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
        color: connected ? 'var(--neon-green)' : '#ffaa00', padding: '2px 10px',
        border: `1px solid ${connected ? 'rgba(0,255,136,0.25)' : 'rgba(255,170,0,0.25)'}`,
        borderRadius: '999px',
        background: connected ? 'rgba(0,255,136,0.07)' : 'rgba(255,170,0,0.07)',
      }}>{connected ? 'NOWHERE LIVE' : 'OFFLINE'}</span>
    </div>
    <LogStream attacks={attacks} connected={connected} />
  </div>
);

// ── Shell ─────────────────────────────────────────────────────────────────────
const Shell = () => {
  const { theme } = useTheme();
  const { attacks, connected, stats } = useHoneypotStream();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-base)', transition: 'all 0.35s' }}>
      <aside className="sidebar" style={{ width: '220px', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: '32px', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px' }}>
          <Shield size={26} className="neon-blue" />
          <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '2px', color: 'var(--text-1)' }}>VIGILANCE</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <NavLink to="/"          icon={<Activity size={17} />}  label="Dashboard" />
          <NavLink to="/threats"   icon={<Globe size={17} />}     label="Threat Map" />
          <NavLink to="/logs"      icon={<Terminal size={17} />}  label="System Logs" />
          <NavLink to="/analytics" icon={<BarChart3 size={17} />} label="Analytics" />
        </nav>

        {/* Connection indicator */}
        <div style={{ padding: '12px 14px', borderRadius: '10px', background: connected ? 'rgba(0,255,136,0.06)' : 'rgba(255,170,0,0.06)', border: `1px solid ${connected ? 'rgba(0,255,136,0.2)' : 'rgba(255,170,0,0.2)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: connected ? '#00ff88' : '#ffaa00', boxShadow: `0 0 6px ${connected ? '#00ff88' : '#ffaa00'}`, animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: connected ? '#00ff88' : '#ffaa00' }}>
              {connected ? 'NOWHERE LIVE' : 'OFFLINE'}
            </span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', lineHeight: 1.4 }}>
            {connected
              ? `${attacks.length} real events captured`
              : 'Nowhere server offline'}
          </p>
        </div>

        <div style={{ padding: '0 6px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '12px' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', background: 'var(--bg-surface)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)' }}>Security Overview</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '2px' }}>
              {connected ? 'Monitoring Nowhere Esports Intranet — real attacks only' : 'Offline — start Nowhere server for live data'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '999px', padding: '6px 16px', fontSize: '13px', fontWeight: 500,
              color: 'var(--text-1)', backdropFilter: 'blur(8px)',
            }}>
              <Wifi size={14} style={{ color: connected ? 'var(--neon-green)' : '#ffaa00' }} />
              {connected ? 'Nowhere Esports Connected' : 'Awaiting Connection'}
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/"          element={<Dashboard attacks={attacks} connected={connected} stats={stats} />} />
          <Route path="/threats"   element={<ThreatsPage attacks={attacks} />} />
          <Route path="/logs"      element={<LogsPage attacks={attacks} connected={connected} />} />
          <Route path="/analytics" element={<AnalyticsPage stats={stats} attacks={attacks} />} />
        </Routes>
      </main>
    </div>
  );
};

import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './hooks/useAuth';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <form onSubmit={handleLogin} className="glass" style={{ padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-1)', textAlign: 'center', marginBottom: '8px' }}>VIGILANCE Login</h2>
        {error && <div style={{ color: 'var(--neon-red)', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-1)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-1)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }} />
        <button type="submit" disabled={loading} style={{ background: 'var(--neon-blue)', color: '#000', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}><div className="pulse-dot" /></div>;
  if (!session) return <LoginScreen />;
  return <>{children}</>;
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AuthGate>
          <Shell />
        </AuthGate>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
