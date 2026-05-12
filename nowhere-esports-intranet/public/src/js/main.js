/**
 * main.js – Global init: dark mode toggle, mobile menu, version info
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  injectSidebar();
});

// ── Theme ─────────────────────────────────────────────────────────────────────
function initTheme() {
  // Always dark for esports — no light mode toggle by default
  document.documentElement.classList.add('dark-mode');
}

// ── Sidebar injection ─────────────────────────────────────────────────────────
function injectSidebar() {
  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  const user = getUser ? getUser() : null;
  const currentPath = window.location.pathname;

  const navItems = [
    { href: '/src/pages/dashboard/index.html', icon: '🏠', label: 'Dashboard' },
    { href: '/src/pages/schedule/index.html',  icon: '📅', label: 'Schedule' },
    { href: '/src/pages/my-team/index.html',   icon: '👥', label: 'My Team' },
    { href: '/src/pages/hr-portal/index.html', icon: '🔐', label: 'HR Portal', adminOnly: true },
    { href: '/src/pages/assets/index.html',    icon: '🎨', label: 'Assets' },
  ];

  const isAdmin = user && (user.role === 'admin' || user.role === 'coach');

  sidebarEl.innerHTML = `
    <div style="padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 36px; height: 36px; background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
          border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">⚡</div>
        <div>
          <div style="font-family: 'Rajdhani', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: 0.1em; color: var(--neon-cyan);">NOWHERE</div>
          <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.15em;">ESPORTS</div>
        </div>
      </div>
    </div>
    <nav style="padding: 0 12px; flex: 1; display: flex; flex-direction: column; gap: 2px;">
      ${navItems.filter(item => !item.adminOnly || isAdmin).map(item => {
        const isActive = currentPath.includes(item.href.split('/').slice(-2)[0]);
        return `
          <a href="${item.href}" style="
            display: flex; align-items: center; gap: 12px; padding: 10px 14px;
            border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none;
            color: ${isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)'};
            background: ${isActive ? 'rgba(0,229,255,0.08)' : 'transparent'};
            border: 1px solid ${isActive ? 'rgba(0,229,255,0.15)' : 'transparent'};
            transition: var(--transition);
          " onmouseover="this.style.color='var(--neon-cyan)';this.style.background='rgba(0,229,255,0.05)';"
             onmouseout="${isActive ? '' : "this.style.color='var(--text-secondary)';this.style.background='transparent';"}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `;
      }).join('')}
    </nav>
    <div style="padding: 16px 20px; border-top: 1px solid var(--border); margin-top: 16px;">
      ${user ? `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 13px; font-weight: 700;">
            ${(user.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 600;">${user.name || user.email}</div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: capitalize;">${user.role || 'player'}</div>
          </div>
        </div>
      ` : ''}
      <button onclick="logout ? logout() : (window.location.href='/src/pages/login/index.html')"
        class="btn btn-danger" style="width: 100%; padding: 8px; font-size: 12px;">
        🚪 Sign Out
      </button>
    </div>
  `;
}
