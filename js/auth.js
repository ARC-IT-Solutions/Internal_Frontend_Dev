/**
 * auth.js
 * Authentication & session management.
 *
 * Roles:
 *   admin       — full access: all inquiries, all tickets, user management view, reports
 *   manager     — all inquiries, all tickets, can assign/reassign, cannot manage users
 *   agent       — only assigned inquiries/tickets + unassigned, cannot access other agents' items
 *   viewer      — read-only across everything, no status changes
 *
 * Session stored in sessionStorage (clears on tab close).
 * For persistent login across tabs, swap to localStorage.
 *
 * In production: token comes from Spring Boot JWT response.
 * Here: mock users are defined inline. Set MOCK: false in api.js to use real backend.
 */

const SESSION_KEY = 'lc_session';

// ─── Role definitions ──────────────────────────────────────────────────────────
export const ROLES = {
  admin:   { label: 'Admin',   level: 4 },
  manager: { label: 'Manager', level: 3 },
  agent:   { label: 'Agent',   level: 2 },
  viewer:  { label: 'Viewer',  level: 1 },
};

// ─── Permission matrix ─────────────────────────────────────────────────────────
export const CAN = {
  updateStatus:   (role) => ['admin','manager','agent'].includes(role),
  assign:         (role) => ['admin','manager'].includes(role),
  reassign:       (role) => ['admin','manager'].includes(role),
  reply:          (role) => ['admin','manager','agent'].includes(role),
  updatePriority: (role) => ['admin','manager'].includes(role),
  viewAllItems:   (role) => ['admin','manager','viewer'].includes(role),
  manageUsers:    (role) => role === 'admin',
  exportData:     (role) => ['admin','manager'].includes(role),
};

// ─── Mock users (replace with real /api/auth/login in production) ──────────────
export const MOCK_USERS = [
  {
    id: 'usr_001', name: 'Admin User',   email: 'admin@company.com',   password: 'admin123',
    role: 'admin',   avatar: 'AU', department: 'Management',
  },
  {
    id: 'usr_002', name: 'Ahmed Hassan',  email: 'ahmed@company.com',   password: 'ahmed123',
    role: 'manager', avatar: 'AH', department: 'Sales',
  },
  {
    id: 'usr_003', name: 'Sara Malik',    email: 'sara@company.com',    password: 'sara123',
    role: 'agent',   avatar: 'SM', department: 'Support',
  },
  {
    id: 'usr_004', name: 'Khalid Nasser', email: 'khalid@company.com',  password: 'khalid123',
    role: 'agent',   avatar: 'KN', department: 'Support',
  },
  {
    id: 'usr_005', name: 'Nour Ibrahim',  email: 'nour@company.com',    password: 'nour123',
    role: 'agent',   avatar: 'NI', department: 'Sales',
  },
  {
    id: 'usr_006', name: 'Rami Saleh',    email: 'rami@company.com',    password: 'rami123',
    role: 'viewer',  avatar: 'RS', department: 'Operations',
  },
];

// ─── Auth API ──────────────────────────────────────────────────────────────────

/**
 * Attempt login. Returns { ok, user, error }.
 * In production: POST /api/auth/login → { token, user }
 * Store token, decode role from JWT or use returned user object.
 */
export async function login(email, password) {
  // ── MOCK ──
  if (true /* swap: CONFIG.MOCK */) {
    await new Promise(r => setTimeout(r, 600)); // simulate network
    const user = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    );
    if (!user) return { ok: false, error: 'Invalid email or password.' };
    const session = {
      token: `mock_token_${user.id}_${Date.now()}`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, department: user.department },
      expires: Date.now() + 8 * 60 * 60 * 1000, // 8 hour session
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, user: session.user };
  }

  // ── PRODUCTION ──
  // try {
  //   const res = await fetch('/api/auth/login', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ email, password }),
  //   });
  //   if (!res.ok) {
  //     const err = await res.json().catch(() => ({}));
  //     return { ok: false, error: err.message || 'Login failed.' };
  //   }
  //   const { token, user } = await res.json();
  //   const session = { token, user, expires: Date.now() + 8 * 60 * 60 * 1000 };
  //   sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  //   return { ok: true, user };
  // } catch (e) {
  //   return { ok: false, error: 'Network error. Please try again.' };
  // }
}

/**
 * Get current session user. Returns user object or null.
 */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expires) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

/**
 * Get auth token for API calls.
 */
export function getToken() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch { return null; }
}

/**
 * Log out and clear session.
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Check if current user can perform an action.
 */
export function can(action, currentUser) {
  if (!currentUser) return false;
  return CAN[action] ? CAN[action](currentUser.role) : false;
}

/**
 * For agents: check if item is visible to them.
 * Agents see items assigned to them + unassigned items.
 * Admins/managers/viewers see everything.
 */
export function canViewItem(item, currentUser) {
  if (!currentUser) return false;
  if (CAN.viewAllItems(currentUser.role)) return true;
  // agent: only their name or unassigned
  const assignedTo = item.assigned_to || 'Unassigned';
  return assignedTo === 'Unassigned' || assignedTo === currentUser.name;
}
