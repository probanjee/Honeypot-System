/**
 * utils.js – Global utility functions for Nowhere Esports Intranet
 */

/** Format a Date object or ISO string to 'May 11, 2026 · 20:00' */
function formatDate(dateInput) {
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) +
         ' · ' +
         d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Debounce: delays func call until after 'wait' ms since last call */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/** Show a toast notification */
function showToast(message, type = 'info', duration = 3500) {
  const existing = document.getElementById('ne-toast-container');
  if (!existing) {
    const container = document.createElement('div');
    container.id = 'ne-toast-container';
    container.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 10px;
      z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  const container = document.getElementById('ne-toast-container');

  const colors = {
    info:    { bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.3)',   icon: 'ℹ️' },
    success: { bg: 'rgba(57,255,20,0.1)',   border: 'rgba(57,255,20,0.3)',   icon: '✅' },
    warning: { bg: 'rgba(255,107,0,0.12)',  border: 'rgba(255,107,0,0.35)',  icon: '⚠️' },
    error:   { bg: 'rgba(255,0,60,0.1)',    border: 'rgba(255,0,60,0.3)',    icon: '❌' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg};
    border: 1px solid ${c.border};
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 13px;
    color: #f5f5ff;
    backdrop-filter: blur(16px);
    display: flex; align-items: center; gap: 10px;
    pointer-events: all;
    animation: slideUp 0.3s ease forwards;
    max-width: 320px;
    font-family: 'Inter', sans-serif;
  `;
  toast.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** Validate email format */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Check password strength: returns 'weak'|'medium'|'strong' */
function checkPasswordStrength(password) {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score === 3 && password.length >= 12) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

/** Simple GET helper with auth header */
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('ne_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('ne_token');
    localStorage.removeItem('ne_user');
    window.location.href = '/src/pages/login/index.html';
    return;
  }
  return res.json();
}

/** Relative time: "2 minutes ago" */
function timeAgo(dateInput) {
  const diff = Date.now() - new Date(dateInput).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
