/**
 * main.js
 * Entry point. Enforces auth on load.
 * Applies role-based permissions. Wires all events.
 */

import State  from './state.js';
import API    from './api.js';
import UI     from './ui.js';
import Notify from './notify.js';
import { getSession, logout, can } from './auth.js';

async function init() {

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  const currentUser = getSession();
  if (!currentUser) {
    window.location.replace('login.html');
    return;
  }
  State.setCurrentUser(currentUser);

  // ─── Render user in topbar ───────────────────────────────────────────────────
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  const roleEl   = document.getElementById('user-role-badge');
  if (avatarEl) avatarEl.textContent = currentUser.avatar;
  if (nameEl)   nameEl.textContent   = currentUser.name;
  if (roleEl) {
    roleEl.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    roleEl.className   = `role-badge role-${currentUser.role}`;
  }

  // Attach role to root so CSS can apply viewer-mode rules globally
  document.documentElement.dataset.role = currentUser.role;

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  Notify.requestPermission();
  await Promise.all([API.fetchEmployees(), API.fetchClients()]);
  await Promise.all([API.fetchInquiries(), API.fetchTickets()]);

  UI.renderTabs();
  UI.renderInquiryList();
  UI.renderTicketList();
  UI.renderSoundToggle(State.isSoundEnabled());
  Notify.updateTabBadge();

  API.startPolling();

  setInterval(() => {
    UI.renderInquiryList();
    UI.renderTicketList();
    UI.renderSyncTime(State.getLastSync());
  }, 60000);

  // ─── State events ────────────────────────────────────────────────────────────

  State.on('inquiries:updated', ({ newOnes }) => {
    UI.renderInquiryList();
    UI.renderSyncTime(State.getLastSync());
    Notify.triggerForNewInquiries(newOnes);
  });

  State.on('tickets:updated', ({ newOnes }) => {
    UI.renderTicketList();
    Notify.triggerForNewTickets(newOnes);
  });

  State.on('inquiry:updated', inq => {
    UI.renderInquiryList();
    if (State.getActiveInqId() === inq.id) UI.renderInquiryDetail(inq.id);
  });

  State.on('ticket:updated', tkt => {
    UI.renderTicketList();
    if (State.getActiveTktId() === tkt.id) UI.renderTicketDetail(tkt.id);
  });

  State.on('sync:updated',  d  => UI.renderSyncTime(d));
  State.on('sound:changed', on => UI.renderSoundToggle(on));
  State.on('api:error',    msg => UI.showError(msg));
  State.on('tab:changed',   () => UI.renderTabs());
  State.on('filter:inq',    () => UI.renderInquiryList());
  State.on('filter:tkt',    () => UI.renderTicketList());

  // ─── Selection ───────────────────────────────────────────────────────────────

  State.on('ui:selectInq', id => {
    State.setActiveInqId(id);
    State.markInquiryRead(id);
    API.patchInquiry(id, { read: true });
    UI.renderInquiryList();
    UI.renderInquiryDetail(id);
    document.getElementById('inq-detail-pane')?.classList.add('detail-open');
  });

  State.on('ui:selectTkt', id => {
    State.setActiveTktId(id);
    State.markTicketRead(id);
    API.patchTicket(id, { read: true });
    UI.renderTicketList();
    UI.renderTicketDetail(id);
    document.getElementById('tkt-detail-pane')?.classList.add('detail-open');
  });

  // ─── Actions (permission-checked) ───────────────────────────────────────────

  State.on('action:inqStatus', async ({ id, status }) => {
    if (!can('updateStatus', currentUser)) return UI.showError('You do not have permission to change status.');
    State.updateInquiry(id, { status });
    await API.patchInquiry(id, { status });
  });

  State.on('action:inqAssign', async ({ id, employee }) => {
    if (!can('assign', currentUser)) return UI.showError('Only managers and admins can assign inquiries.');
    State.updateInquiry(id, { assigned_to: employee });
    await API.patchInquiry(id, { assigned_to: employee });
  });

  State.on('action:tktStatus', async ({ id, status }) => {
    if (!can('updateStatus', currentUser)) return UI.showError('You do not have permission to change status.');
    State.updateTicket(id, { status, updated_at: new Date().toISOString() });
    await API.patchTicket(id, { status });
  });

  State.on('action:tktPriority', async ({ id, priority }) => {
    if (!can('updatePriority', currentUser)) return UI.showError('Only managers and admins can change priority.');
    State.updateTicket(id, { priority });
    await API.patchTicket(id, { priority });
  });

  State.on('action:tktAssign', async ({ id, employee }) => {
    if (!can('assign', currentUser)) return UI.showError('Only managers and admins can assign tickets.');
    State.updateTicket(id, { assigned_to: employee });
    await API.patchTicket(id, { assigned_to: employee });
  });

  State.on('action:tktReply', async ({ id, body }) => {
    if (!can('reply', currentUser)) return UI.showError('Viewers cannot send replies.');
    const reply = await API.postReply(id, body);
    if (reply) UI.appendReply(reply);
  });

  // ─── DOM bindings ─────────────────────────────────────────────────────────────

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => State.setActiveTab(btn.dataset.tab)));

  document.getElementById('inq-filter-status')?.addEventListener('change',
    e => State.setInqFilter(e.target.value));

  document.getElementById('tkt-filter-status')?.addEventListener('change',
    e => State.setTktFilter(e.target.value));

  document.getElementById('tkt-filter-priority')?.addEventListener('change',
    e => State.setTktPriFilter(e.target.value));

  document.getElementById('sound-toggle')?.addEventListener('click',
    () => State.toggleSound());

  document.getElementById('notif-bar-close')?.addEventListener('click',
    () => Notify.hideBar());

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    window.location.replace('login.html');
  });

  // Mobile back
  document.getElementById('inq-back-btn')?.addEventListener('click', () => {
    document.getElementById('inq-detail-pane')?.classList.remove('detail-open');
    State.setActiveInqId(null);
    UI.clearInquiryDetail();
  });
  document.getElementById('tkt-back-btn')?.addEventListener('click', () => {
    document.getElementById('tkt-detail-pane')?.classList.remove('detail-open');
    State.setActiveTktId(null);
    UI.clearTicketDetail();
  });

  // Keyboard nav
  ['inquiry-list','ticket-list'].forEach(listId => {
    document.getElementById(listId)?.addEventListener('keydown', e => {
      const rows = [...document.querySelectorAll(`#${listId} [role="option"]`)];
      const idx  = rows.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && idx < rows.length - 1) rows[idx + 1].focus();
      if (e.key === 'ArrowUp'   && idx > 0)               rows[idx - 1].focus();
    });
  });

  // Refetch on tab refocus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { API.fetchInquiries(); API.fetchTickets(); }
  });

  console.info(`[Lead Console] ${currentUser.name} (${currentUser.role}) signed in`);
}

document.addEventListener('DOMContentLoaded', init);
