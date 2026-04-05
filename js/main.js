/**
 * main.js
 * Application entry point.
 * Wires: State events → UI renders → User actions → API calls
 */

import State from './state.js';
import API   from './api.js';
import UI    from './ui.js';
import Notify from './notify.js';

async function init() {
  // ─── Bootstrap ──────────────────────────────────────────────────────────────

  Notify.requestPermission();

  // Load reference data
  await Promise.all([API.fetchEmployees(), API.fetchClients()]);

  // Initial data fetch
  await Promise.all([API.fetchInquiries(), API.fetchTickets()]);

  // Render initial state
  UI.renderTabs();
  UI.renderInquiryList();
  UI.renderTicketList();
  UI.renderSoundToggle(State.isSoundEnabled());
  Notify.updateTabBadge();

  // Start polling
  API.startPolling();

  // Refresh relative timestamps every 60s
  setInterval(() => {
    UI.renderInquiryList();
    UI.renderTicketList();
    UI.renderSyncTime(State.getLastSync());
  }, 60000);

  // ─── State → UI event handlers ───────────────────────────────────────────────

  State.on('inquiries:updated', ({ newOnes }) => {
    UI.renderInquiryList();
    UI.renderSyncTime(State.getLastSync());
    Notify.triggerForNewInquiries(newOnes);
  });

  State.on('tickets:updated', ({ newOnes }) => {
    UI.renderTicketList();
    Notify.triggerForNewTickets(newOnes);
  });

  State.on('inquiry:updated', (inq) => {
    UI.renderInquiryList();
    if (State.getActiveInqId() === inq.id) UI.renderInquiryDetail(inq.id);
  });

  State.on('ticket:updated', (tkt) => {
    UI.renderTicketList();
    if (State.getActiveTktId() === tkt.id) UI.renderTicketDetail(tkt.id);
  });

  State.on('sync:updated', (date) => UI.renderSyncTime(date));
  State.on('sound:changed', (on)  => UI.renderSoundToggle(on));
  State.on('api:error',   (msg)   => UI.showError(msg));
  State.on('tab:changed', ()      => { UI.renderTabs(); });
  State.on('filter:inq',  ()      => UI.renderInquiryList());
  State.on('filter:tkt',  ()      => UI.renderTicketList());

  // ─── UI selection events ─────────────────────────────────────────────────────

  State.on('ui:selectInq', (id) => {
    State.setActiveInqId(id);
    State.markInquiryRead(id);
    API.patchInquiry(id, { read: true });
    UI.renderInquiryList();
    UI.renderInquiryDetail(id);
    document.getElementById('inq-detail-pane')?.classList.add('detail-open');
  });

  State.on('ui:selectTkt', (id) => {
    State.setActiveTktId(id);
    State.markTicketRead(id);
    API.patchTicket(id, { read: true });
    UI.renderTicketList();
    UI.renderTicketDetail(id);
    document.getElementById('tkt-detail-pane')?.classList.add('detail-open');
  });

  // ─── Action events ───────────────────────────────────────────────────────────

  // Inquiry actions
  State.on('action:inqStatus', async ({ id, status }) => {
    State.updateInquiry(id, { status });
    await API.patchInquiry(id, { status });
  });

  State.on('action:inqAssign', async ({ id, employee }) => {
    State.updateInquiry(id, { assigned_to: employee });
    await API.patchInquiry(id, { assigned_to: employee });
  });

  // Ticket actions
  State.on('action:tktStatus', async ({ id, status }) => {
    State.updateTicket(id, { status, updated_at: new Date().toISOString() });
    await API.patchTicket(id, { status });
  });

  State.on('action:tktPriority', async ({ id, priority }) => {
    State.updateTicket(id, { priority });
    await API.patchTicket(id, { priority });
  });

  State.on('action:tktAssign', async ({ id, employee }) => {
    State.updateTicket(id, { assigned_to: employee });
    await API.patchTicket(id, { assigned_to: employee });
  });

  State.on('action:tktReply', async ({ id, body }) => {
    const reply = await API.postReply(id, body);
    if (reply) UI.appendReply(reply);
  });

  // ─── DOM bindings ─────────────────────────────────────────────────────────────

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => State.setActiveTab(btn.dataset.tab));
  });

  // Inquiry filters
  document.getElementById('inq-filter-status')?.addEventListener('change', e =>
    State.setInqFilter(e.target.value));

  // Ticket filters
  document.getElementById('tkt-filter-status')?.addEventListener('change', e =>
    State.setTktFilter(e.target.value));
  document.getElementById('tkt-filter-priority')?.addEventListener('change', e =>
    State.setTktPriFilter(e.target.value));

  // Sound toggle
  document.getElementById('sound-toggle')?.addEventListener('click', () =>
    State.toggleSound());

  // Notification bar dismiss
  document.getElementById('notif-bar-close')?.addEventListener('click', () =>
    Notify.hideBar());

  // Mobile back buttons
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

  // Keyboard nav in lists
  ['inquiry-list','ticket-list'].forEach(listId => {
    document.getElementById(listId)?.addEventListener('keydown', e => {
      const rows = [...document.querySelectorAll(`#${listId} [role="option"]`)];
      const focused = document.activeElement;
      const idx = rows.indexOf(focused);
      if (e.key === 'ArrowDown' && idx < rows.length-1) rows[idx+1].focus();
      if (e.key === 'ArrowUp'   && idx > 0)             rows[idx-1].focus();
    });
  });

  // Refetch on tab focus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      API.fetchInquiries();
      API.fetchTickets();
    }
  });

  console.info('[Lead Console] Ready. Polling every', API.CONFIG.POLL_INTERVAL_MS/1000, 's');
}

document.addEventListener('DOMContentLoaded', init);
