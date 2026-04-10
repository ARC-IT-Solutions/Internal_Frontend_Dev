/**
 * config.js
 * ─────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH FOR ALL API URLS.
 *
 * To switch environments, change BASE_URL only.
 * Every API call in the entire app derives its URL from here.
 * ─────────────────────────────────────────────────────────────
 */

// ── Change this one line to switch environments ──────────────
// export const BASE_URL = 'https://backend-prod-9t0y.onrender.com/api/v1';
export const BASE_URL  = 'https://localhost:8000/api/vi';

// ── Derived endpoint builders (never edit below this line) ───

export const ENDPOINTS = {

  // AUTH
  login:           () => `${BASE_URL}/auth/login`,
  refresh:         () => `${BASE_URL}/auth/refresh`,
  me:              () => `${BASE_URL}/auth/me`,
  mePassword:      () => `${BASE_URL}/auth/me/password`,
  register:        () => `${BASE_URL}/auth/register`,

  // USERS
  users:           (params = '') => `${BASE_URL}/users${params ? '?' + params : ''}`,
  user:            (id)  => `${BASE_URL}/users/${id}`,
  userMe:          () => `${BASE_URL}/users/me`,

  // INQUIRIES
  inquiries:       (params = '') => `${BASE_URL}/inquiries${params ? '?' + params : ''}`,
  inquiry:         (id)  => `${BASE_URL}/inquiries/${id}`,

  // TICKETS
  tickets:         (params = '') => `${BASE_URL}/tickets${params ? '?' + params : ''}`,
  ticket:          (id)  => `${BASE_URL}/tickets/${id}`,

  // PROJECTS
  projects:        (params = '') => `${BASE_URL}/projects${params ? '?' + params : ''}`,
  project:         (id)  => `${BASE_URL}/projects/${id}`,

  // PROJECT REQUESTS
  projectRequests: (params = '') => `${BASE_URL}/project-requests${params ? '?' + params : ''}`,
  projectRequest:  (id)  => `${BASE_URL}/project-requests/${id}`,

  // INVOICES
  invoices:        (params = '') => `${BASE_URL}/invoices${params ? '?' + params : ''}`,
  invoice:         (id)  => `${BASE_URL}/invoices/${id}`,
  invoiceUpload:   (id)  => `${BASE_URL}/invoices/${id}/upload`,
  invoiceDownload: (id)  => `${BASE_URL}/invoices/${id}/download`,

  // AUDIT LOGS
  auditLogs:       (params = '') => `${BASE_URL}/audit-logs${params ? '?' + params : ''}`,
  auditEntity:     (type, id, params = '') => `${BASE_URL}/audit-logs/entity/${type}/${id}${params ? '?' + params : ''}`,

  // HEALTH
  health:          () => `https://backend-prod-9t0y.onrender.com/health`,
  ready:           () => `https://backend-prod-9t0y.onrender.com/ready`,
};

// ── Polling interval ─────────────────────────────────────────
export const POLL_INTERVAL_MS = 15000;

// ── Page sizes ───────────────────────────────────────────────
export const PAGE_SIZE = 20;
