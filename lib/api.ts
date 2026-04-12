/**
 * lib/api.ts
 * Typed server-side API client.
 * All URLs from EP in config.ts. Used in Server Components + Route Handlers.
 */

import { EP, qs } from './config';
import type {
  AuthTokens, User, Paginated,
  Inquiry, ConvertInquiryPayload, ConvertInquiryResponse,
  Project, OnboardingData,
  Milestone, Invoice, Payment, RecordPaymentPayload,
  Ticket, TicketComment, AuditLog,
} from '@/types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message); this.name = 'ApiError';
  }
}

async function req<T>(url: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers, cache: 'no-store' });
  if (res.status === 204) return null as T;
  let data: unknown;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const d = data as Record<string, unknown> | null;
    let msg = `Request failed (${res.status})`;
    if (typeof d?.detail === 'string') msg = d.detail;
    else if (Array.isArray(d?.detail)) msg = String((d.detail[0] as Record<string,string>).msg ?? 'Validation error');
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

const g   = <T>(url: string, token: string | null) => req<T>(url, token);
const p   = <T>(url: string, token: string | null, body: unknown) => req<T>(url, token, { method: 'POST', body: JSON.stringify(body) });
const pa  = <T>(url: string, token: string | null, body: unknown) => req<T>(url, token, { method: 'PATCH', body: JSON.stringify(body) });
const del = (url: string, token: string | null)   => req<null>(url, token, { method: 'DELETE' });

// AUTH
export const authApi = {
  login:          (email: string, password: string) => p<AuthTokens>(EP.login, null, { email, password }),
  me:             (token: string) => g<User>(EP.me, token),
  changePassword: (token: string, current_password: string, new_password: string) =>
    pa<null>(EP.mePassword, token, { current_password, new_password }),
  register:       (token: string, payload: { email: string; password: string; full_name: string; phone?: string; role: string }) =>
    p<User>(EP.register, token, payload),
};

// USERS
export const usersApi = {
  list:     (token: string, params: Record<string, unknown> = {}) => g<Paginated<User>>(EP.users(qs(params)), token),
  get:      (token: string, id: string) => g<User>(EP.user(id), token),
  updateMe: (token: string, payload: { full_name?: string; phone?: string }) => pa<User>(EP.userMe, token, payload),
  update:   (token: string, id: string, payload: Partial<User>) => pa<User>(EP.user(id), token, payload),
};

// INQUIRIES
export const inquiriesApi = {
  list:    (token: string, params: Record<string, unknown> = {}) => g<Paginated<Inquiry>>(EP.inquiries(qs(params)), token),
  get:     (token: string, id: string) => g<Inquiry>(EP.inquiry(id), token),
  patch:   (token: string, id: string, payload: Partial<Inquiry>) => pa<Inquiry>(EP.inquiry(id), token, payload),
  delete:  (token: string, id: string) => del(EP.inquiry(id), token),
  convert: (token: string, id: string, payload: ConvertInquiryPayload) =>
    p<ConvertInquiryResponse>(EP.inquiryConvert(id), token, payload),
};

// PROJECTS
export const projectsApi = {
  list:   (token: string, params: Record<string, unknown> = {}) => g<Paginated<Project>>(EP.projects(qs(params)), token),
  get:    (token: string, id: string) => g<Project>(EP.project(id), token),
  create: (token: string, payload: Partial<Project>) => p<Project>(EP.projects(), token, payload),
  patch:  (token: string, id: string, payload: Partial<Project>) => pa<Project>(EP.project(id), token, payload),
  delete: (token: string, id: string) => del(EP.project(id), token),
};

// ONBOARDING
export const onboardingApi = {
  get:    (token: string, projectId: string) => g<OnboardingData>(EP.onboarding(projectId), token),
  submit: (token: string, projectId: string, payload: Partial<OnboardingData>) =>
    p<OnboardingData>(EP.onboarding(projectId), token, payload),
  review: (token: string, projectId: string, payload: { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string }) =>
    pa<OnboardingData>(EP.onboardingReview(projectId), token, payload),
};

// MILESTONES
export const milestonesApi = {
  list:     (token: string, projectId: string) => g<Milestone[]>(EP.milestones(projectId), token),
  create:   (token: string, projectId: string, payload: Partial<Milestone>) =>
    p<Milestone>(EP.milestones(projectId), token, payload),
  update:   (token: string, projectId: string, msId: string, payload: Partial<Milestone>) =>
    pa<Milestone>(EP.milestone(projectId, msId), token, payload),
  activate: (token: string, projectId: string, msId: string) =>
    p<Milestone>(EP.milestoneActivate(projectId, msId), token, {}),
  delete:   (token: string, projectId: string, msId: string) =>
    del(EP.milestone(projectId, msId), token),
};

// TICKETS
export const ticketsApi = {
  list:        (token: string, params: Record<string, unknown> = {}) => g<Paginated<Ticket>>(EP.tickets(qs(params)), token),
  get:         (token: string, id: string) => g<Ticket>(EP.ticket(id), token),
  create:      (token: string, payload: Partial<Ticket> & { project_id: string }) => p<Ticket>(EP.tickets(), token, payload),
  patch:       (token: string, id: string, payload: Partial<Ticket>) => pa<Ticket>(EP.ticket(id), token, payload),
  delete:      (token: string, id: string) => del(EP.ticket(id), token),
  getComments: (token: string, id: string) => g<TicketComment[]>(EP.ticketComments(id), token),
  addComment:  (token: string, id: string, message: string, is_internal = false) =>
    p<TicketComment>(EP.ticketComments(id), token, { message, is_internal }),
};

// INVOICES
export const invoicesApi = {
  list:            (token: string, params: Record<string, unknown> = {}) => g<Paginated<Invoice>>(EP.invoices(qs(params)), token),
  get:             (token: string, id: string) => g<Invoice>(EP.invoice(id), token),
  create:          (token: string, payload: Partial<Invoice>) => p<Invoice>(EP.invoices(), token, payload),
  patch:           (token: string, id: string, payload: Partial<Invoice>) => pa<Invoice>(EP.invoice(id), token, payload),
  delete:          (token: string, id: string) => del(EP.invoice(id), token),
  getDownloadLink: (token: string, id: string) =>
    g<{ signed_url: string; expires_in: number }>(EP.invoiceDownload(id), token),
};

// PAYMENTS
export const paymentsApi = {
  record:        (token: string, payload: RecordPaymentPayload) => p<Payment>(EP.payments, token, payload),
  listByInvoice: (token: string, invoiceId: string) => g<Payment[]>(EP.paymentsByInvoice(invoiceId), token),
  delete:        (token: string, paymentId: string) => del(EP.payment(paymentId), token),
};

// AUDIT LOGS
export const auditApi = {
  list:   (token: string, params: Record<string, unknown> = {}) => g<Paginated<AuditLog>>(EP.auditLogs(qs(params)), token),
  entity: (token: string, type: string, id: string) => g<Paginated<AuditLog>>(EP.auditEntity(type, id), token),
};
