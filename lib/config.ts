/**
 * lib/config.ts
 * ─────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH FOR ALL API CONFIGURATION.
 *
 * Change BASE_URL here once → every API call in the app updates.
 * ─────────────────────────────────────────────────────────────
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
  ?? 'https://backend-prod-9t0y.onrender.com/api/v1';

export const POLL_INTERVAL_MS = 15_000;
export const PAGE_SIZE        = 20;
export const SESSION_COOKIE   = 'lc_session';

/** All API endpoint builders. Never hardcode URLs anywhere else. */
export const EP = {
  // AUTH
  login:           `${API_BASE}/auth/login`,
  refresh:         `${API_BASE}/auth/refresh`,
  me:              `${API_BASE}/auth/me`,
  mePassword:      `${API_BASE}/auth/me/password`,
  register:        `${API_BASE}/auth/register`,

  // USERS
  users:           (q = '') => `${API_BASE}/users${q ? `?${q}` : ''}`,
  user:            (id: string) => `${API_BASE}/users/${id}`,
  userMe:          `${API_BASE}/users/me`,

  // INQUIRIES
  inquiries:       (q = '') => `${API_BASE}/inquiries${q ? `?${q}` : ''}`,
  inquiry:         (id: string) => `${API_BASE}/inquiries/${id}`,
  inquiryConvert:  (id: string) => `${API_BASE}/inquiries/${id}/convert`,

  // PROJECTS
  projects:        (q = '') => `${API_BASE}/projects${q ? `?${q}` : ''}`,
  project:         (id: string) => `${API_BASE}/projects/${id}`,

  // ONBOARDING
  onboarding:      (projectId: string) => `${API_BASE}/projects/${projectId}/onboarding`,
  onboardingReview:(projectId: string) => `${API_BASE}/projects/${projectId}/onboarding/review`,

  // MILESTONES
  milestones:      (projectId: string) => `${API_BASE}/projects/${projectId}/milestones`,
  milestone:       (projectId: string, msId: string) => `${API_BASE}/projects/${projectId}/milestones/${msId}`,
  milestoneActivate:(projectId: string, msId: string) => `${API_BASE}/projects/${projectId}/milestones/${msId}/activate`,

  // TICKETS
  tickets:         (q = '') => `${API_BASE}/tickets${q ? `?${q}` : ''}`,
  ticket:          (id: string) => `${API_BASE}/tickets/${id}`,
  ticketComments:  (id: string) => `${API_BASE}/tickets/${id}/comments`,

  // INVOICES
  invoices:        (q = '') => `${API_BASE}/invoices${q ? `?${q}` : ''}`,
  invoice:         (id: string) => `${API_BASE}/invoices/${id}`,
  invoiceUpload:   (id: string) => `${API_BASE}/invoices/${id}/upload`,
  invoiceDownload: (id: string) => `${API_BASE}/invoices/${id}/download`,

  // PAYMENTS
  payments:                    `${API_BASE}/payments`,
  paymentsByInvoice: (invId: string) => `${API_BASE}/payments/invoice/${invId}`,
  payment:           (id: string) => `${API_BASE}/payments/${id}`,

  // AUDIT LOGS
  auditLogs:       (q = '') => `${API_BASE}/audit-logs${q ? `?${q}` : ''}`,
  auditEntity:     (type: string, id: string) => `${API_BASE}/audit-logs/entity/${type}/${id}`,

  // HEALTH
  health: `${API_BASE.replace('/api/v1', '')}/health`,
  ready:  `${API_BASE.replace('/api/v1', '')}/ready`,
} as const;

/** Build a query string, dropping null/undefined/empty/'all' values */
export function qs(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'all')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}
