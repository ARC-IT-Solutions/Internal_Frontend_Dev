/**
 * api.js
 * Every API call the employee console makes, mapped to real endpoints.
 * All URLs come from config.js → ENDPOINTS.
 * All HTTP calls go through http.js (handles auth + refresh).
 *
 * Return shape: { ok: bool, data: any, error: string|null, status: number }
 */

import { ENDPOINTS, POLL_INTERVAL_MS, PAGE_SIZE } from './config.js';
import { http, httpUpload, qs } from './http.js';
import State from './state.js';

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

export async function apiGetMe() {
  return http(ENDPOINTS.me());
}

export async function apiChangePassword(currentPassword, newPassword) {
  return http(ENDPOINTS.mePassword(), {
    method: 'PATCH',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function apiRegisterUser(payload) {
  // Admin: onboard a new client or employee
  // payload: { email, password, full_name, phone, role }
  return http(ENDPOINTS.register(), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ══════════════════════════════════════════════════════════════
// USERS  (admin: manage all users | employee: view profiles)
// ══════════════════════════════════════════════════════════════

export async function apiFetchUsers({ page = 1, page_size = PAGE_SIZE } = {}) {
  const result = await http(ENDPOINTS.users(qs({ page, page_size })));
  if (result.ok) State.setUsers(result.data.items || []);
  return result;
}

export async function apiFetchUser(id) {
  return http(ENDPOINTS.user(id));
}

export async function apiUpdateMe(payload) {
  // { full_name, phone }
  const result = await http(ENDPOINTS.userMe(), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (result.ok) {
    const user = State.getCurrentUser();
    State.setCurrentUser({ ...user, name: result.data.full_name, phone: result.data.phone });
  }
  return result;
}

export async function apiUpdateUser(id, payload) {
  // Admin: { role, is_active, is_verified }
  const result = await http(ENDPOINTS.user(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (result.ok) State.updateUser(id, payload);
  return result;
}

// ══════════════════════════════════════════════════════════════
// INQUIRIES
// ══════════════════════════════════════════════════════════════

export async function apiFetchInquiries({ page = 1, status, priority, assigned_to } = {}) {
  const result = await http(ENDPOINTS.inquiries(qs({ page, page_size: PAGE_SIZE, status, priority, assigned_to })));
  if (result.ok) {
    const newOnes = State.setInquiries(result.data.items || []);
    State.setLastSync(new Date());
    return { ...result, newOnes };
  }
  State.emit('api:error', result.error);
  return { ...result, newOnes: [] };
}

export async function apiFetchInquiry(id) {
  return http(ENDPOINTS.inquiry(id));
}

export async function apiPatchInquiry(id, payload) {
  State.updateInquiry(id, payload); // optimistic
  return http(ENDPOINTS.inquiry(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteInquiry(id) {
  const result = await http(ENDPOINTS.inquiry(id), { method: 'DELETE' });
  if (result.ok) State.removeInquiry(id);
  return result;
}

// ══════════════════════════════════════════════════════════════
// TICKETS
// ══════════════════════════════════════════════════════════════

export async function apiFetchTickets({ page = 1, status, priority, assigned_to, project_id } = {}) {
  const result = await http(ENDPOINTS.tickets(qs({ page, page_size: PAGE_SIZE, status, priority, assigned_to, project_id })));
  if (result.ok) {
    const newOnes = State.setTickets(result.data.items || []);
    return { ...result, newOnes };
  }
  State.emit('api:error', result.error);
  return { ...result, newOnes: [] };
}

export async function apiFetchTicket(id) {
  return http(ENDPOINTS.ticket(id));
}

export async function apiPatchTicket(id, payload) {
  State.updateTicket(id, payload); // optimistic
  return http(ENDPOINTS.ticket(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteTicket(id) {
  const result = await http(ENDPOINTS.ticket(id), { method: 'DELETE' });
  if (result.ok) State.removeTicket(id);
  return result;
}

// ══════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════

export async function apiFetchProjects({ page = 1, status, priority, assigned_to } = {}) {
  const result = await http(ENDPOINTS.projects(qs({ page, page_size: PAGE_SIZE, status, priority, assigned_to })));
  if (result.ok) State.setProjects(result.data.items || [], result.data.total);
  else State.emit('api:error', result.error);
  return result;
}

export async function apiFetchProject(id) {
  return http(ENDPOINTS.project(id));
}

export async function apiCreateProject(payload) {
  const result = await http(ENDPOINTS.projects(), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (result.ok) State.addProject(result.data);
  return result;
}

export async function apiPatchProject(id, payload) {
  State.updateProject(id, payload); // optimistic
  return http(ENDPOINTS.project(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteProject(id) {
  const result = await http(ENDPOINTS.project(id), { method: 'DELETE' });
  if (result.ok) State.removeProject(id);
  return result;
}

// ══════════════════════════════════════════════════════════════
// PROJECT REQUESTS
// ══════════════════════════════════════════════════════════════

export async function apiFetchProjectRequests({ page = 1, status, priority } = {}) {
  const result = await http(ENDPOINTS.projectRequests(qs({ page, page_size: PAGE_SIZE, status, priority })));
  if (result.ok) State.setProjectRequests(result.data.items || [], result.data.total);
  else State.emit('api:error', result.error);
  return result;
}

export async function apiFetchProjectRequest(id) {
  return http(ENDPOINTS.projectRequest(id));
}

export async function apiPatchProjectRequest(id, payload) {
  State.updateProjectRequest(id, payload); // optimistic
  return http(ENDPOINTS.projectRequest(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

// ══════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════

export async function apiFetchInvoices({ page = 1, status, project_id } = {}) {
  const result = await http(ENDPOINTS.invoices(qs({ page, page_size: PAGE_SIZE, status, project_id })));
  if (result.ok) State.setInvoices(result.data.items || [], result.data.total);
  else State.emit('api:error', result.error);
  return result;
}

export async function apiFetchInvoice(id) {
  return http(ENDPOINTS.invoice(id));
}

export async function apiCreateInvoice(payload) {
  const result = await http(ENDPOINTS.invoices(), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (result.ok) State.addInvoice(result.data);
  return result;
}

export async function apiPatchInvoice(id, payload) {
  State.updateInvoice(id, payload); // optimistic
  return http(ENDPOINTS.invoice(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiUploadInvoice(id, file) {
  const fd = new FormData();
  fd.append('file', file);
  const result = await httpUpload(ENDPOINTS.invoiceUpload(id), fd);
  if (result.ok) State.updateInvoice(id, { file_url: result.data.file_url, file_path: result.data.file_path });
  return result;
}

export async function apiDownloadInvoice(id) {
  return http(ENDPOINTS.invoiceDownload(id));
}

export async function apiDeleteInvoice(id) {
  const result = await http(ENDPOINTS.invoice(id), { method: 'DELETE' });
  if (result.ok) State.removeInvoice(id);
  return result;
}

// ══════════════════════════════════════════════════════════════
// AUDIT LOGS  (admin only)
// ══════════════════════════════════════════════════════════════

export async function apiFetchAuditLogs({ page = 1, user_id, action, entity_type } = {}) {
  const result = await http(ENDPOINTS.auditLogs(qs({ page, page_size: PAGE_SIZE, user_id, action, entity_type })));
  if (result.ok) State.setAuditLogs(result.data.items || [], result.data.total);
  return result;
}

export async function apiFetchEntityAudit(entityType, entityId, { page = 1 } = {}) {
  return http(ENDPOINTS.auditEntity(entityType, entityId, qs({ page, page_size: PAGE_SIZE })));
}

// ══════════════════════════════════════════════════════════════
// POLLING
// ══════════════════════════════════════════════════════════════

let _pollTimer = null;

export function startPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(async () => {
    const filters = State.getActiveFilters();
    const [inqR, tktR] = await Promise.all([
      apiFetchInquiries(filters.inquiries),
      apiFetchTickets(filters.tickets),
    ]);
    State.setLastSync(new Date());
    return { inqNewOnes: inqR.newOnes || [], tktNewOnes: tktR.newOnes || [] };
  }, POLL_INTERVAL_MS);
}

export function stopPolling() {
  clearInterval(_pollTimer);
  _pollTimer = null;
}
