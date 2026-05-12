/**
 * auth.js – Client-side authentication helpers for Nowhere Esports
 */

const AUTH_TOKEN_KEY = 'ne_token';
const AUTH_USER_KEY  = 'ne_user';

/** Get the stored JWT token */
function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Get the stored user object */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

/** Store token and user after successful login */
function storeAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/** Clear auth data (logout) */
function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/** Redirect to login if not authenticated */
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/src/pages/login/index.html';
    return false;
  }
  return true;
}

/** Logout: clear storage, call API, redirect */
async function logout() {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
  } catch (e) {
    // ignore network errors on logout
  }
  clearAuth();
  window.location.href = '/src/pages/login/index.html';
}

/** Check if user has required role */
function hasRole(role) {
  const user = getUser();
  if (!user) return false;
  if (Array.isArray(role)) return role.includes(user.role);
  return user.role === role;
}

// ── Inject current user info into the page if #user-display exists ──────────
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  const el = document.getElementById('user-display');
  if (el && user) {
    el.textContent = user.name || user.email || 'Player';
  }

  // Hide admin-only elements for non-admins
  if (!hasRole(['admin', 'coach'])) {
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.style.display = 'none';
    });
  }
});
