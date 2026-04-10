/**
 * auth.js
 * Authentication, session, token refresh, and role permissions.
 * All API calls use ENDPOINTS from config.js.
 */

import { ENDPOINTS } from './config.js';

const SESSION_KEY  = 'lc_session';
const REFRESH_KEY  = 'lc_refresh';

// ─── Role permission matrix ────────────────────────────────────────────────────
export const CAN = {
  updateStatus:     role => ['admin','employee'].includes(role),
  assign:           role => ['admin','employee'].includes(role),
  updatePriority:   role => ['admin','employee'].includes(role),
  reply:            role => ['admin','employee'].includes(role),
  deleteRecords:    role => role === 'admin',
  manageUsers:      role => role === 'admin',
  viewAuditLogs:    role => role === 'admin',
  createProject:    role => ['admin','employee'].includes(role),
  createInvoice:    role => ['admin','employee'].includes(role),
  uploadInvoice:    role => ['admin','employee'].includes(role),
  reviewRequests:   role => ['admin','employee'].includes(role),
  registerClient:   role => role === 'admin',
  viewAllItems:     role => ['admin','employee'].includes(role),
  changePassword:   role => true,
  editProfile:      role => true,
};

export function can(action, user) {
  if (!user) return false;
  return CAN[action] ? CAN[action](user.role) : false;
}

// ─── Session helpers ───────────────────────────────────────────────────────────
export function saveSession(accessToken, user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    access_token: accessToken,
    user,
    expires: Date.now() + 8 * 60 * 60 * 1000,
  }));
}

export function saveRefreshToken(token) {
  // Use localStorage so refresh survives tab close
  if (token) localStorage.setItem(REFRESH_KEY, token);
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expires) { clearSession(); return null; }
    return s.user;
  } catch { return null; }
}

export function getAccessToken() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw).access_token : null;
  } catch { return null; }
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function logout() {
  clearSession();
}

// ─── Login ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  try {
    const res = await fetch(ENDPOINTS.login(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.detail || 'Invalid email or password.' };
    }

    const { access_token, refresh_token } = await res.json();

    // Fetch the real user profile
    const meRes = await fetch(ENDPOINTS.me(), {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    if (!meRes.ok) return { ok: false, error: 'Could not load user profile.' };

    const user = await meRes.json();

    // Block client-role users from accessing the internal console
    if (user.role === 'client') {
      return { ok: false, error: 'This portal is for employees only. Please use the client portal.' };
    }

    // Build a normalized user object
    const normalized = {
      id:         user.id,
      name:       user.full_name,
      email:      user.email,
      phone:      user.phone,
      role:       user.role,       // 'admin' | 'employee'
      is_active:  user.is_active,
      is_verified: user.is_verified,
      avatar:     user.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(),
    };

    saveSession(access_token, normalized);
    saveRefreshToken(refresh_token);

    return { ok: true, user: normalized };
  } catch (e) {
    console.error('[Auth] login error:', e);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

// ─── Token refresh ─────────────────────────────────────────────────────────────
let _refreshPromise = null;

export async function refreshAccessToken() {
  // Deduplicate concurrent refresh attempts
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(ENDPOINTS.refresh(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) { clearSession(); return false; }

      const { access_token } = await res.json();
      const user = getSession();
      if (user) saveSession(access_token, user);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}
