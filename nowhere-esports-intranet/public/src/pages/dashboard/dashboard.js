// ── Populate date ─────────────────────────────────────────────────────────────
const el = document.getElementById('dateDisplay');
if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ── Auth guard ────────────────────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
    localStorage.setItem('token', urlToken);
    localStorage.setItem('user', JSON.stringify({ id: urlParams.get('userId'), name: decodeURIComponent(urlParams.get('userName')) }));
    window.history.replaceState({}, document.title, window.location.pathname);
}

const token = localStorage.getItem('token');
if (!token) window.location.href = '../login/index.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user && user.name) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userInitial').textContent = user.name[0].toUpperCase();
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../login/index.html';
});

// ── Live Ticker (SSE or simulated) ────────────────────────────────────────────
const DEMO_TICKER = [
    'Nowhere Knights 10–8 Fnatic  |  Valorant Champions',
    'Nowhere Nexus 2–1 G2 Esports  |  League of Legends',
    'NO Knights 15–12 NaVi  |  CS2 Pro League',
    'Game 2 starting soon: Nowhere vs. T1',
];
let tickerIdx = 0;
const tickerEl = document.getElementById('matchTicker');

function updateTicker() {
    tickerEl.textContent = DEMO_TICKER.map(s => `   •   ${s}`).join('   ');
}
updateTicker();

// Try SSE, fall back to simulated
try {
    const es = new EventSource('/matches/live/sse');
    es.onmessage = (e) => {
        const matches = JSON.parse(e.data);
        if (!matches.length) return;
        tickerEl.textContent = matches.map(m => `${m.team1} ${m.score?.team1 ?? '–'}:${m.score?.team2 ?? '–'} ${m.team2}  [${m.gameTitle}]`).join('   •   ');
    };
    es.onerror = () => es.close();
} catch (_) { /* SSE not available */ }

// ── Match Grid ────────────────────────────────────────────────────────────────
const DEMO_MATCHES = [
    { gameTitle: 'Valorant Champions', team1: 'Nowhere Knights', team2: 'Fnatic', startTime: new Date(Date.now() + 3600000) },
    { gameTitle: 'League of Legends LEC', team1: 'Nowhere Nexus', team2: 'G2 Esports', startTime: new Date(Date.now() + 7200000) },
    { gameTitle: 'CS2 Pro League', team1: 'NO Knights', team2: 'NaVi', startTime: new Date(Date.now() + 86400000) },
];

async function loadMatches() {
    let matches = DEMO_MATCHES;
    try {
        const res = await fetch('/matches', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) matches = await res.json();
    } catch (_) {}

    const grid = document.getElementById('matchGrid');
    grid.innerHTML = matches.map(m => `
        <div class="match-item">
            <div>
                <div class="match-game">${m.gameTitle}</div>
                <div class="match-teams">
                    <strong>${m.team1}</strong>
                    <span class="match-vs">vs</span>
                    <strong>${m.team2}</strong>
                </div>
            </div>
            <div class="match-time">${new Date(m.startTime).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
        </div>
    `).join('');
}

loadMatches();
