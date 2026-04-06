/**
 * ui.js
 * All DOM rendering. Reads from State. Emits events for actions.
 * Role-aware: controls are disabled/hidden based on current user permissions.
 */

import State  from './state.js';
import Notify from './notify.js';
import { can } from './auth.js';

const UI = (() => {

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function relTime(iso) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }
  function fullDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
         + ' · ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }
  function initials(name) {
    return String(name).split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  }

  const INQ_STATUS = { new:'New', contacted:'Contacted', in_progress:'In Progress', closed:'Closed' };
  const TKT_STATUS = { open:'Open', in_progress:'In Progress', pending:'Pending', resolved:'Resolved', closed:'Closed' };
  const TKT_PRI    = { low:'Low', medium:'Medium', high:'High', critical:'Critical' };

  // ─── Tab rendering ─────────────────────────────────────────────────────────
  function renderTabs() {
    const active = State.getActiveTab();
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === active));
    const inqPane = document.getElementById('inq-pane');
    const tktPane = document.getElementById('tkt-pane');
    if (inqPane) inqPane.style.display = active === 'inquiries' ? 'flex' : 'none';
    if (tktPane) tktPane.style.display = active === 'tickets'   ? 'flex' : 'none';
    Notify.updateTabBadge();
  }

  function renderSyncTime(date) {
    const el = document.getElementById('sync-time');
    if (el) el.textContent = date ? `Synced ${relTime(date.toISOString())}` : 'Syncing...';
  }

  function renderSoundToggle(on) {
    const btn = document.getElementById('sound-toggle');
    if (btn) { btn.textContent = on ? '🔔 Sound' : '🔕 Muted'; btn.setAttribute('aria-pressed', on); }
  }

  // ─── Inquiry list ──────────────────────────────────────────────────────────
  function renderInquiryList() {
    const container = document.getElementById('inquiry-list');
    if (!container) return;
    const items    = State.getFilteredInquiries();
    const activeId = State.getActiveInqId();
    const countEl  = document.getElementById('inq-count');
    if (countEl) countEl.textContent = `${items.length} ${items.length === 1 ? 'inquiry' : 'inquiries'}`;
    Notify.updateTabBadge();

    const rendered = new Set();
    items.forEach(inq => {
      rendered.add(inq.id);
      let row = container.querySelector(`[data-id="${inq.id}"]`);
      const isNew = !row;
      if (isNew) {
        row = document.createElement('div');
        row.dataset.id = inq.id;
        row.setAttribute('role', 'option');
        row.setAttribute('tabindex', '0');
        row.addEventListener('click',   ()  => State.emit('ui:selectInq', inq.id));
        row.addEventListener('keydown', e   => { if (e.key==='Enter'||e.key===' ') State.emit('ui:selectInq', inq.id); });
      }
      const overdue = State.isInquiryOverdue(inq);
      row.className = ['inquiry-row',
        inq.id === activeId ? 'active' : '',
        !inq.read && inq.id !== activeId ? 'unread' : '',
        overdue ? 'overdue' : '',
      ].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar status-${inq.status}"></div>
        <div class="row-body">
          <div class="row-top">
            <span class="row-name">${esc(inq.name)}</span>
            <span class="row-time">${relTime(inq.timestamp)}</span>
          </div>
          <div class="row-service">${esc(inq.service_type)}</div>
          <div class="row-chips">
            ${overdue ? '<span class="chip chip-danger">Overdue</span>' : ''}
            ${inq.assigned_to && inq.assigned_to !== 'Unassigned' ? `<span class="chip chip-info">${esc(inq.assigned_to)}</span>` : ''}
            <span class="chip chip-muted">${INQ_STATUS[inq.status] || inq.status}</span>
          </div>
        </div>`;
      if (isNew) container.appendChild(row);
    });

    [...container.querySelectorAll('[data-id]')].forEach(el => {
      if (!rendered.has(el.dataset.id)) el.remove();
    });
    items.forEach((inq, i) => {
      const row = container.querySelector(`[data-id="${inq.id}"]`);
      if (row && container.children[i] !== row) container.insertBefore(row, container.children[i]);
    });
  }

  // ─── Inquiry detail ────────────────────────────────────────────────────────
  function renderInquiryDetail(id) {
    const inq   = State.getInquiry(id);
    const empty = document.getElementById('inq-empty');
    const body  = document.getElementById('inq-detail-body');
    if (!inq || !empty || !body) return;
    empty.style.display = 'none';
    body.style.display  = 'flex';

    const user    = State.getCurrentUser();
    const canEdit = can('updateStatus', user);
    const canAsgn = can('assign', user);
    const emps    = State.getEmployees();

    body.innerHTML = `
      <div class="detail-header">
        <div class="avatar">${initials(inq.name)}</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(inq.name)}</h2>
          <p class="detail-sub">${esc(inq.service_type)}</p>
        </div>
        <span class="status-badge status-badge-${inq.status}">${INQ_STATUS[inq.status] || inq.status}</span>
      </div>

      <div class="detail-actions">
        <a href="tel:${esc(inq.phone)}" class="btn btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.13 15.8 19.79 19.79 0 011.06 7.16 2 2 0 013.05 5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 12.91a16 16 0 006 6z"/>
          </svg>
          Call
        </a>
        <a href="https://wa.me/${inq.phone.replace(/\D/g,'')}" target="_blank" rel="noopener" class="btn btn-whatsapp">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.87 9.87 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>
        <a href="mailto:${esc(inq.email)}" class="btn btn-ghost">Email</a>
        ${canEdit ? `<button class="btn btn-secondary" id="inq-mark-contacted" ${inq.status !== 'new' ? 'disabled' : ''}>Mark Contacted</button>` : ''}
      </div>

      <div class="detail-section">
        <div class="section-label">Contact</div>
        <table class="info-table"><tbody>
          <tr><td>Phone</td><td><a href="tel:${esc(inq.phone)}">${esc(inq.phone)}</a></td></tr>
          <tr><td>Email</td><td><a href="mailto:${esc(inq.email)}">${esc(inq.email)}</a></td></tr>
          <tr><td>Received</td><td>${fullDate(inq.timestamp)}</td></tr>
          <tr><td>Source</td><td>${esc(inq.source || 'Website Form')}</td></tr>
        </tbody></table>
      </div>

      <div class="detail-section">
        <div class="section-label">Message</div>
        <blockquote class="message-block">${esc(inq.message)}</blockquote>
      </div>

      <div class="detail-section">
        <div class="section-label">Status &amp; Assignment</div>
        <div class="controls-row">
          <label class="control-group">
            <span class="control-label">Status</span>
            <select id="inq-status-sel" ${!canEdit ? 'disabled' : ''}>
              ${['new','contacted','in_progress','closed'].map(s =>
                `<option value="${s}" ${inq.status === s ? 'selected' : ''}>${INQ_STATUS[s]}</option>`
              ).join('')}
            </select>
          </label>
          <label class="control-group">
            <span class="control-label">Assigned to
              ${!canAsgn ? '<span class="perm-lock" title="Manager or Admin required">🔒</span>' : ''}
            </span>
            <select id="inq-assign-sel" ${!canAsgn ? 'disabled' : ''}>
              ${emps.map(e => `<option ${inq.assigned_to === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}
            </select>
          </label>
        </div>
        ${!canEdit ? '<p class="perm-note">View-only access. Contact a manager to make changes.</p>' : ''}
      </div>`;

    document.getElementById('inq-mark-contacted')?.addEventListener('click', () =>
      State.emit('action:inqStatus', { id: inq.id, status: 'contacted' }));
    document.getElementById('inq-status-sel')?.addEventListener('change', e =>
      State.emit('action:inqStatus', { id: inq.id, status: e.target.value }));
    document.getElementById('inq-assign-sel')?.addEventListener('change', e =>
      State.emit('action:inqAssign', { id: inq.id, employee: e.target.value }));
  }

  function clearInquiryDetail() {
    const empty = document.getElementById('inq-empty');
    const body  = document.getElementById('inq-detail-body');
    if (empty) empty.style.display = 'flex';
    if (body)  { body.style.display = 'none'; body.innerHTML = ''; }
  }

  // ─── Ticket list ───────────────────────────────────────────────────────────
  function renderTicketList() {
    const container = document.getElementById('ticket-list');
    if (!container) return;
    const items    = State.getFilteredTickets();
    const activeId = State.getActiveTktId();
    const countEl  = document.getElementById('tkt-count');
    if (countEl) countEl.textContent = `${items.length} ${items.length === 1 ? 'ticket' : 'tickets'}`;
    Notify.updateTabBadge();

    const rendered = new Set();
    items.forEach(tkt => {
      rendered.add(tkt.id);
      let row = container.querySelector(`[data-id="${tkt.id}"]`);
      const isNew = !row;
      if (isNew) {
        row = document.createElement('div');
        row.dataset.id = tkt.id;
        row.setAttribute('role', 'option');
        row.setAttribute('tabindex', '0');
        row.addEventListener('click',   ()  => State.emit('ui:selectTkt', tkt.id));
        row.addEventListener('keydown', e   => { if (e.key==='Enter'||e.key===' ') State.emit('ui:selectTkt', tkt.id); });
      }
      const overdue = State.isTicketOverdue(tkt);
      row.className = ['ticket-row',
        tkt.id === activeId ? 'active' : '',
        !tkt.read && tkt.id !== activeId ? 'unread' : '',
        overdue ? 'overdue' : '',
      ].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar pri-${tkt.priority}"></div>
        <div class="row-body">
          <div class="row-top">
            <span class="row-num">${esc(tkt.ticket_number)}</span>
            <span class="row-time">${relTime(tkt.created_at)}</span>
          </div>
          <div class="row-name">${esc(tkt.subject)}</div>
          <div class="row-service">${esc(tkt.client_name)} · ${esc(tkt.project || tkt.category)}</div>
          <div class="row-chips">
            <span class="chip chip-pri-${tkt.priority}">${TKT_PRI[tkt.priority]}</span>
            <span class="chip chip-tkt-${tkt.status}">${TKT_STATUS[tkt.status] || tkt.status}</span>
            ${overdue ? '<span class="chip chip-danger">Overdue</span>' : ''}
            ${tkt.replies?.length ? `<span class="chip chip-muted">${tkt.replies.length} ${tkt.replies.length === 1 ? 'reply' : 'replies'}</span>` : ''}
          </div>
        </div>`;
      if (isNew) container.appendChild(row);
    });

    [...container.querySelectorAll('[data-id]')].forEach(el => {
      if (!rendered.has(el.dataset.id)) el.remove();
    });
    items.forEach((tkt, i) => {
      const row = container.querySelector(`[data-id="${tkt.id}"]`);
      if (row && container.children[i] !== row) container.insertBefore(row, container.children[i]);
    });
  }

  // ─── Ticket detail ─────────────────────────────────────────────────────────
  function renderTicketDetail(id) {
    const tkt   = State.getTicket(id);
    const empty = document.getElementById('tkt-empty');
    const body  = document.getElementById('tkt-detail-body');
    if (!tkt || !empty || !body) return;
    empty.style.display = 'none';
    body.style.display  = 'flex';

    const user        = State.getCurrentUser();
    const canEdit     = can('updateStatus', user);
    const canAsgn     = can('assign', user);
    const canPri      = can('updatePriority', user);
    const canReply    = can('reply', user);
    const emps        = State.getEmployees();
    const overdue     = State.isTicketOverdue(tkt);
    const isDone      = ['resolved','closed'].includes(tkt.status);

    body.innerHTML = `
      <div class="detail-header">
        <div class="avatar avatar-tkt">${initials(tkt.client_name)}</div>
        <div class="detail-title-block">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span class="tkt-number">${esc(tkt.ticket_number)}</span>
            <span class="chip chip-pri-${tkt.priority}">${TKT_PRI[tkt.priority]}</span>
            ${overdue ? '<span class="chip chip-danger">Overdue</span>' : ''}
          </div>
          <h2 class="detail-name">${esc(tkt.subject)}</h2>
          <p class="detail-sub">${esc(tkt.client_name)} · ${esc(tkt.project || '')}</p>
        </div>
        <span class="status-badge status-badge-tkt-${tkt.status}">${TKT_STATUS[tkt.status] || tkt.status}</span>
      </div>

      <div class="detail-actions">
        <a href="mailto:${esc(tkt.client_email)}" class="btn btn-primary">Email Client</a>
        ${canEdit ? `
          <button class="btn btn-secondary" id="tkt-take-btn"    ${tkt.status !== 'open' ? 'disabled' : ''}>Take Ownership</button>
          <button class="btn btn-success"   id="tkt-resolve-btn" ${isDone ? 'disabled' : ''}>Mark Resolved</button>
          <button class="btn btn-ghost"     id="tkt-close-btn"   ${tkt.status === 'closed' ? 'disabled' : ''}>Close</button>
        ` : '<span class="perm-note" style="align-self:center">View-only access</span>'}
      </div>

      <div class="detail-section" style="display:flex;gap:20px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <div class="section-label">Client</div>
          <table class="info-table"><tbody>
            <tr><td>Name</td><td>${esc(tkt.client_name)}</td></tr>
            <tr><td>Email</td><td><a href="mailto:${esc(tkt.client_email)}">${esc(tkt.client_email)}</a></td></tr>
            <tr><td>Project</td><td>${esc(tkt.project || '—')}</td></tr>
            <tr><td>Category</td><td>${esc(tkt.category || '—')}</td></tr>
          </tbody></table>
        </div>
        <div style="flex:1;min-width:180px">
          <div class="section-label">Ticket</div>
          <table class="info-table"><tbody>
            <tr><td>Opened</td><td>${fullDate(tkt.created_at)}</td></tr>
            <tr><td>Updated</td><td>${fullDate(tkt.updated_at)}</td></tr>
            <tr><td>Priority</td><td>${TKT_PRI[tkt.priority]}</td></tr>
            <tr><td>Assigned</td><td>${esc(tkt.assigned_to || 'Unassigned')}</td></tr>
          </tbody></table>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Description</div>
        <blockquote class="message-block">${esc(tkt.description)}</blockquote>
      </div>

      <div class="detail-section">
        <div class="section-label">Status &amp; Assignment</div>
        <div class="controls-row">
          <label class="control-group">
            <span class="control-label">Status</span>
            <select id="tkt-status-sel" ${!canEdit ? 'disabled' : ''}>
              ${['open','in_progress','pending','resolved','closed'].map(s =>
                `<option value="${s}" ${tkt.status === s ? 'selected' : ''}>${TKT_STATUS[s]}</option>`
              ).join('')}
            </select>
          </label>
          <label class="control-group">
            <span class="control-label">Priority
              ${!canPri ? '<span class="perm-lock" title="Manager or Admin required">🔒</span>' : ''}
            </span>
            <select id="tkt-pri-sel" ${!canPri ? 'disabled' : ''}>
              ${['low','medium','high','critical'].map(p =>
                `<option value="${p}" ${tkt.priority === p ? 'selected' : ''}>${TKT_PRI[p]}</option>`
              ).join('')}
            </select>
          </label>
          <label class="control-group">
            <span class="control-label">Assigned to
              ${!canAsgn ? '<span class="perm-lock" title="Manager or Admin required">🔒</span>' : ''}
            </span>
            <select id="tkt-assign-sel" ${!canAsgn ? 'disabled' : ''}>
              ${emps.map(e => `<option ${tkt.assigned_to === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>

      <div class="detail-section" id="replies-section">
        <div class="section-label">Thread (${tkt.replies?.length || 0})</div>
        <div id="reply-thread">${_repliesHTML(tkt.replies || [])}</div>
        ${canReply ? `
          <div class="reply-compose">
            <textarea id="reply-input" placeholder="Write a reply to the client… (Ctrl+Enter to send)" rows="3"></textarea>
            <div class="reply-actions">
              <button class="btn btn-primary" id="reply-send-btn">Send Reply</button>
              <span class="reply-hint">Ctrl+Enter</span>
            </div>
          </div>` : '<p class="perm-note" style="margin-top:10px">Viewers cannot send replies.</p>'}
      </div>`;

    // Bind action buttons
    document.getElementById('tkt-take-btn')?.addEventListener('click', () =>
      State.emit('action:tktStatus', { id: tkt.id, status: 'in_progress' }));
    document.getElementById('tkt-resolve-btn')?.addEventListener('click', () =>
      State.emit('action:tktStatus', { id: tkt.id, status: 'resolved' }));
    document.getElementById('tkt-close-btn')?.addEventListener('click', () =>
      State.emit('action:tktStatus', { id: tkt.id, status: 'closed' }));

    // Bind selects
    document.getElementById('tkt-status-sel')?.addEventListener('change', e =>
      State.emit('action:tktStatus', { id: tkt.id, status: e.target.value }));
    document.getElementById('tkt-pri-sel')?.addEventListener('change', e =>
      State.emit('action:tktPriority', { id: tkt.id, priority: e.target.value }));
    document.getElementById('tkt-assign-sel')?.addEventListener('change', e =>
      State.emit('action:tktAssign', { id: tkt.id, employee: e.target.value }));

    // Reply compose
    const replyInput = document.getElementById('reply-input');
    document.getElementById('reply-send-btn')?.addEventListener('click', () => {
      const txt = replyInput?.value?.trim();
      if (!txt) return;
      State.emit('action:tktReply', { id: tkt.id, body: txt });
      replyInput.value = '';
    });
    replyInput?.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const txt = e.target.value.trim();
        if (txt) { State.emit('action:tktReply', { id: tkt.id, body: txt }); e.target.value = ''; }
      }
    });
  }

  function _repliesHTML(replies) {
    if (!replies.length) return '<p class="no-replies">No replies yet.</p>';
    return replies.map(r => `
      <div class="reply-item reply-${r.author_role}">
        <div class="reply-meta">
          <span class="reply-author">${esc(r.author)}</span>
          <span class="chip ${r.author_role === 'client' ? 'chip-info' : 'chip-muted'}" style="font-size:10px">
            ${r.author_role === 'client' ? 'Client' : 'Staff'}
          </span>
          <span class="reply-time">${relTime(r.created_at)}</span>
        </div>
        <div class="reply-body">${esc(r.body)}</div>
      </div>`).join('');
  }

  function appendReply(reply) {
    const thread = document.getElementById('reply-thread');
    if (!thread) return;
    const placeholder = thread.querySelector('.no-replies');
    if (placeholder) thread.innerHTML = '';
    thread.insertAdjacentHTML('beforeend', _repliesHTML([reply]));
    thread.scrollTop = thread.scrollHeight;
    const tkt = State.getTicket(State.getActiveTktId());
    const label = document.querySelector('#replies-section .section-label');
    if (label && tkt) label.textContent = `Thread (${tkt.replies?.length || 0})`;
  }

  function clearTicketDetail() {
    const empty = document.getElementById('tkt-empty');
    const body  = document.getElementById('tkt-detail-body');
    if (empty) empty.style.display = 'flex';
    if (body)  { body.style.display = 'none'; body.innerHTML = ''; }
  }

  // ─── Error toast ───────────────────────────────────────────────────────────
  function showError(msg) {
    const el = document.getElementById('error-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 5000);
  }

  return {
    renderTabs,
    renderSyncTime,
    renderSoundToggle,
    renderInquiryList,
    renderInquiryDetail,
    clearInquiryDetail,
    renderTicketList,
    renderTicketDetail,
    clearTicketDetail,
    appendReply,
    showError,
  };
})();

export default UI;
