/**
 * main.js
 * Application entry point.
 * Auth guard → bootstrap → wire all State events → wire DOM.
 */

import State   from './state.js';
import UI      from './ui.js';
import Notify  from './notify.js';
import { getSession, logout, can } from './auth.js';
import {
  apiFetchInquiries, apiPatchInquiry, apiDeleteInquiry,
  apiFetchTickets,   apiPatchTicket,   apiDeleteTicket,
  apiFetchProjects,  apiCreateProject, apiPatchProject, apiDeleteProject,
  apiFetchProjectRequests, apiPatchProjectRequest,
  apiFetchInvoices,  apiCreateInvoice, apiPatchInvoice, apiUploadInvoice, apiDownloadInvoice, apiDeleteInvoice,
  apiFetchUsers,     apiUpdateUser,    apiUpdateMe,     apiRegisterUser, apiChangePassword,
  apiFetchAuditLogs,
  startPolling, stopPolling,
} from './api.js';

// ── Tabs visible per role ──────────────────────────────────────
const TABS_BY_ROLE = {
  admin:    ['inquiries','tickets','projects','requests','invoices','users','audit','profile'],
  employee: ['inquiries','tickets','projects','requests','invoices','profile'],
};

async function init() {
  // ── Auth guard ──────────────────────────────────────────────
  const currentUser = getSession();
  if (!currentUser) { window.location.replace('login.html'); return; }

  State.setCurrentUser(currentUser);
  UI.renderUserChip(currentUser);
  document.documentElement.dataset.role = currentUser.role;

  // Show/hide tabs based on role
  const allowedTabs = TABS_BY_ROLE[currentUser.role] || TABS_BY_ROLE.employee;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.style.display = allowedTabs.includes(btn.dataset.tab) ? '' : 'none';
  });

  // ── Initial data load ───────────────────────────────────────
  Notify.requestPermission();
  await Promise.all([
    apiFetchInquiries(),
    apiFetchTickets(),
    apiFetchProjects(),
    apiFetchProjectRequests(),
    apiFetchInvoices(),
    ...(currentUser.role === 'admin' ? [apiFetchUsers(), apiFetchAuditLogs()] : []),
  ]);

  UI.renderTabs();
  UI.renderInquiryList();
  UI.renderTicketList();
  UI.renderProjectList();
  UI.renderProjectRequestList();
  UI.renderInvoiceList();
  if (currentUser.role === 'admin') { UI.renderUserList(); UI.renderAuditLogs(); }
  UI.renderSoundToggle(State.isSoundEnabled());
  Notify.updateTabBadge();

  startPolling();

  // Refresh relative timestamps every 60s
  setInterval(() => {
    [UI.renderInquiryList, UI.renderTicketList, UI.renderProjectList, UI.renderProjectRequestList, UI.renderInvoiceList].forEach(fn => fn());
    UI.renderSyncTime(State.getLastSync());
  }, 60000);

  // ── State → UI ──────────────────────────────────────────────

  State.on('inquiries:updated',       ({ newOnes }) => { UI.renderInquiryList();       UI.renderSyncTime(State.getLastSync()); Notify.triggerForNewInquiries(newOnes); });
  State.on('tickets:updated',         ({ newOnes }) => { UI.renderTicketList();         Notify.triggerForNewTickets(newOnes); });
  State.on('projects:updated',        ()           => UI.renderProjectList());
  State.on('projectRequests:updated', ()           => UI.renderProjectRequestList());
  State.on('invoices:updated',        ()           => UI.renderInvoiceList());
  State.on('users:updated',           ()           => UI.renderUserList());
  State.on('auditLogs:updated',       ()           => UI.renderAuditLogs());

  State.on('inquiry:updated',         inq          => { UI.renderInquiryList();        if (State.getActiveId('inquiries')       === inq.id) UI.renderInquiryDetail(inq.id); });
  State.on('ticket:updated',          tkt          => { UI.renderTicketList();         if (State.getActiveId('tickets')         === tkt.id) UI.renderTicketDetail(tkt.id); });
  State.on('project:updated',         p            => { UI.renderProjectList();        if (State.getActiveId('projects')        === p.id)   UI.renderProjectDetail(p.id); });
  State.on('projectRequest:updated',  r            => { UI.renderProjectRequestList(); if (State.getActiveId('projectRequests') === r.id)   UI.renderProjectRequestDetail(r.id); });
  State.on('invoice:updated',         inv          => { UI.renderInvoiceList();        if (State.getActiveId('invoices')        === inv.id)  UI.renderInvoiceDetail(inv.id); });
  State.on('user:updated',            u            => { UI.renderUserList();           if (State.getActiveId('users')           === u.id)   UI.renderUserDetail(u.id); });

  State.on('inquiry:removed',  id => { UI.renderInquiryList(); if (State.getActiveId('inquiries') === id) UI.renderInquiryDetail(null); });
  State.on('ticket:removed',   id => { UI.renderTicketList();  if (State.getActiveId('tickets')   === id) UI.renderTicketDetail(null);  });
  State.on('project:removed',  id => { UI.renderProjectList(); if (State.getActiveId('projects')  === id) UI.renderProjectDetail(null);  });
  State.on('invoice:removed',  id => { UI.renderInvoiceList(); if (State.getActiveId('invoices')  === id) UI.renderInvoiceDetail(null);  });

  State.on('project:added',  () => UI.renderProjectList());
  State.on('invoice:added',  () => UI.renderInvoiceList());
  State.on('user:added',     () => UI.renderUserList());

  State.on('sync:updated',   d  => UI.renderSyncTime(d));
  State.on('sound:changed',  on => UI.renderSoundToggle(on));
  State.on('api:error',      msg => UI.showError(msg));
  State.on('tab:changed',    () => UI.renderTabs());

  // ── Row selection ───────────────────────────────────────────
  State.on('ui:select', ({ tab, id }) => {
    State.setActiveId(tab, id);
    // Mark read
    if (tab === 'inquiries')       { State.markInquiryRead(id); UI.renderInquiryList();        UI.renderInquiryDetail(id); }
    if (tab === 'tickets')         { State.markTicketRead(id);  UI.renderTicketList();          UI.renderTicketDetail(id); }
    if (tab === 'projects')        { UI.renderProjectList();        UI.renderProjectDetail(id); }
    if (tab === 'projectRequests') { UI.renderProjectRequestList(); UI.renderProjectRequestDetail(id); }
    if (tab === 'invoices')        { UI.renderInvoiceList();        UI.renderInvoiceDetail(id); }
    if (tab === 'users')           { UI.renderUserList();           UI.renderUserDetail(id); }
    document.getElementById(`${tab === 'projectRequests' ? 'req' : tab.slice(0,3)}-detail-pane`)?.classList.add('detail-open');
  });

  // ── Actions ─────────────────────────────────────────────────

  // Inquiries
  State.on('action:inquiryPatch', async ({ id, payload }) => {
    if (!can('updateStatus', currentUser)) return UI.showError('Insufficient permissions.');
    await apiPatchInquiry(id, payload);
  });
  State.on('action:inquiryDelete', async id => {
    if (!can('deleteRecords', currentUser)) return UI.showError('Admin only.');
    const r = await apiDeleteInquiry(id);
    if (r.ok) { State.setActiveId('inquiries', null); UI.showSuccess('Inquiry deleted.'); }
    else UI.showError(r.error);
  });

  // Tickets
  State.on('action:ticketPatch', async ({ id, payload }) => {
    if (!can('updateStatus', currentUser)) return UI.showError('Insufficient permissions.');
    await apiPatchTicket(id, payload);
  });
  State.on('action:ticketDelete', async id => {
    if (!can('deleteRecords', currentUser)) return UI.showError('Admin only.');
    const r = await apiDeleteTicket(id);
    if (r.ok) { State.setActiveId('tickets', null); UI.showSuccess('Ticket deleted.'); }
    else UI.showError(r.error);
  });

  // Projects
  State.on('action:projectCreate', async payload => {
    if (!can('createProject', currentUser)) return UI.showError('Insufficient permissions.');
    const r = await apiCreateProject(payload);
    if (r.ok) UI.showSuccess('Project created.');
    else UI.showError(r.error);
  });
  State.on('action:projectPatch', async ({ id, payload }) => {
    if (!can('createProject', currentUser)) return UI.showError('Insufficient permissions.');
    await apiPatchProject(id, payload);
  });
  State.on('action:projectDelete', async id => {
    if (!can('deleteRecords', currentUser)) return UI.showError('Admin only.');
    const r = await apiDeleteProject(id);
    if (r.ok) { State.setActiveId('projects', null); UI.showSuccess('Project deleted.'); }
    else UI.showError(r.error);
  });

  // Project Requests
  State.on('action:requestPatch', async ({ id, payload }) => {
    if (!can('reviewRequests', currentUser)) return UI.showError('Insufficient permissions.');
    const r = await apiPatchProjectRequest(id, payload);
    if (r.ok) UI.showSuccess('Request updated.');
    else UI.showError(r.error);
  });

  // Invoices
  State.on('action:invoiceCreate', async payload => {
    if (!can('createInvoice', currentUser)) return UI.showError('Insufficient permissions.');
    const r = await apiCreateInvoice(payload);
    if (r.ok) UI.showSuccess(`Invoice ${r.data.invoice_number} created.`);
    else UI.showError(r.error);
  });
  State.on('action:invoicePatch', async ({ id, payload }) => {
    if (!can('createInvoice', currentUser)) return UI.showError('Insufficient permissions.');
    await apiPatchInvoice(id, payload);
  });
  State.on('action:invoiceUpload', async ({ id, file }) => {
    if (!can('uploadInvoice', currentUser)) return UI.showError('Insufficient permissions.');
    const r = await apiUploadInvoice(id, file);
    if (r.ok) UI.showSuccess('PDF uploaded successfully.');
    else UI.showError(r.error);
  });
  State.on('action:invoiceDownload', async id => {
    const r = await apiDownloadInvoice(id);
    if (r.ok && r.data?.signed_url) window.open(r.data.signed_url, '_blank');
    else UI.showError(r.error || 'No download link available.');
  });
  State.on('action:invoiceDelete', async id => {
    if (!can('deleteRecords', currentUser)) return UI.showError('Admin only.');
    const r = await apiDeleteInvoice(id);
    if (r.ok) { State.setActiveId('invoices', null); UI.showSuccess('Invoice deleted.'); }
    else UI.showError(r.error);
  });

  // Users (admin)
  State.on('action:userPatch', async ({ id, payload }) => {
    if (!can('manageUsers', currentUser)) return UI.showError('Admin only.');
    const r = await apiUpdateUser(id, payload);
    if (r.ok) UI.showSuccess('User updated.');
    else UI.showError(r.error);
  });
  State.on('action:userRegister', async payload => {
    if (!can('registerClient', currentUser)) return UI.showError('Admin only.');
    const r = await apiRegisterUser(payload);
    if (r.ok) {
      State.addUser(r.data);
      UI.renderUserList();
      UI.showSuccess(`Account created: ${r.data.full_name} (${r.data.role}). ID: ${r.data.id}`);
    } else UI.showError(r.error);
  });

  // Profile
  State.on('action:profileUpdate', async payload => {
    const r = await apiUpdateMe(payload);
    if (r.ok) { UI.renderUserChip(State.getCurrentUser()); UI.showSuccess('Profile updated.'); }
    else UI.showError(r.error);
  });
  State.on('action:passwordChange', async ({ current, next }) => {
    const r = await apiChangePassword(current, next);
    if (r.ok) UI.showSuccess('Password changed successfully.');
    else UI.showError(r.error);
  });

  // ── DOM bindings ────────────────────────────────────────────

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      State.setActiveTab(btn.dataset.tab);
      // Reload data for that tab when switched to
      const tab = btn.dataset.tab;
      if (tab === 'audit' && currentUser.role === 'admin') apiFetchAuditLogs(State.getFilter('auditLogs'));
      if (tab === 'users' && currentUser.role === 'admin') apiFetchUsers();
    }));

  // "Create" toolbar buttons
  document.getElementById('proj-create-btn')?.addEventListener('click', () => UI.renderCreateProjectForm());
  document.getElementById('inv-create-btn')?.addEventListener('click',  () => UI.renderCreateInvoiceForm());
  document.getElementById('usr-register-btn')?.addEventListener('click',() => UI.renderRegisterForm());
  document.getElementById('profile-btn')?.addEventListener('click',     () => {
    State.setActiveTab('profile'); UI.renderTabs(); UI.renderProfilePanel();
  });

  // Filters — Inquiries
  document.getElementById('inq-filter-status')?.addEventListener('change', e => { State.setFilter('inquiries','status',e.target.value||null); apiFetchInquiries(State.getFilter('inquiries')); });
  document.getElementById('inq-filter-priority')?.addEventListener('change', e => { State.setFilter('inquiries','priority',e.target.value||null); apiFetchInquiries(State.getFilter('inquiries')); });

  // Filters — Tickets
  document.getElementById('tkt-filter-status')?.addEventListener('change', e => { State.setFilter('tickets','status',e.target.value||null); apiFetchTickets(State.getFilter('tickets')); });
  document.getElementById('tkt-filter-priority')?.addEventListener('change', e => { State.setFilter('tickets','priority',e.target.value||null); apiFetchTickets(State.getFilter('tickets')); });

  // Filters — Projects
  document.getElementById('proj-filter-status')?.addEventListener('change', e => { State.setFilter('projects','status',e.target.value||null); apiFetchProjects(State.getFilter('projects')); });

  // Filters — Project Requests
  document.getElementById('req-filter-status')?.addEventListener('change', e => { State.setFilter('projectRequests','status',e.target.value||null); apiFetchProjectRequests(State.getFilter('projectRequests')); });

  // Filters — Invoices
  document.getElementById('inv-filter-status')?.addEventListener('change', e => { State.setFilter('invoices','status',e.target.value||null); apiFetchInvoices(State.getFilter('invoices')); });

  // Filters — Audit Logs (admin)
  document.getElementById('audit-filter-action')?.addEventListener('change', e => { State.setFilter('auditLogs','action',e.target.value||null); apiFetchAuditLogs(State.getFilter('auditLogs')); });
  document.getElementById('audit-filter-entity')?.addEventListener('change', e => { State.setFilter('auditLogs','entity_type',e.target.value||null); apiFetchAuditLogs(State.getFilter('auditLogs')); });

  // Sound toggle
  document.getElementById('sound-toggle')?.addEventListener('click', () => State.toggleSound());

  // Notification bar
  document.getElementById('notif-bar-close')?.addEventListener('click', () => Notify.hideBar());

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => { logout(); window.location.replace('login.html'); });

  // Mobile back buttons
  ['inq','tkt','proj','req','inv','usr'].forEach(prefix => {
    document.getElementById(`${prefix}-back-btn`)?.addEventListener('click', () => {
      document.getElementById(`${prefix}-detail-pane`)?.classList.remove('detail-open');
    });
  });

  // Keyboard nav in all lists
  ['inquiries-list','tickets-list','projects-list','requests-list','invoices-list','users-list'].forEach(listId => {
    document.getElementById(listId)?.addEventListener('keydown', e => {
      const rows = [...document.querySelectorAll(`#${listId} [role="option"]`)];
      const idx  = rows.indexOf(document.activeElement);
      if (e.key==='ArrowDown' && idx < rows.length-1) rows[idx+1].focus();
      if (e.key==='ArrowUp'   && idx > 0)             rows[idx-1].focus();
    });
  });

  // Refetch on tab refocus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { apiFetchInquiries(); apiFetchTickets(); }
  });

  console.info(`[Lead Console] ${currentUser.name} (${currentUser.role}) — all APIs active`);
}

document.addEventListener('DOMContentLoaded', init);
