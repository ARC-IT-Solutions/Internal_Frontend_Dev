/**
 * ui.js
 * All DOM rendering. Pure functions — reads State, emits events.
 * Covers: Inquiries, Tickets, Projects, Project Requests, Invoices, Users (admin), Audit Logs (admin).
 */

import State   from './state.js';
import Notify  from './notify.js';
import { can } from './auth.js';

const UI = (() => {

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  function relTime(iso) {
    if (!iso) return '—';
    const s = Math.floor((Date.now()-new Date(iso))/1000);
    if (s<60) return 'just now'; if (s<3600) return `${Math.floor(s/60)}m ago`;
    if (s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  }
  function fullDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
      + ' · '+new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  function initials(name) { return String(name).split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
  function money(n,cur='USD') { return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD'}).format(n||0); }
  function priChip(p) { return `<span class="chip chip-pri-${(p||'').toLowerCase()}">${p||'—'}</span>`; }
  function statusChip(s,prefix='') { return `<span class="chip chip-${prefix}${(s||'').toLowerCase().replace('_','-')}">${(s||'—').replace('_',' ')}</span>`; }

  const INQ_STATUSES = ['NEW','CONTACTED','QUALIFIED','CONVERTED','REJECTED'];
  const TKT_STATUSES = ['OPEN','IN_PROGRESS','WAITING_CLIENT','RESOLVED','CLOSED'];
  const PRJ_STATUSES = ['DRAFT','PLANNING','IN_PROGRESS','ON_HOLD','REVIEW','COMPLETED','CANCELLED'];
  const REQ_STATUSES = ['PENDING','UNDER_REVIEW','APPROVED','REJECTED','CONVERTED'];
  const INV_STATUSES = ['DRAFT','SENT','PAID','OVERDUE','CANCELLED'];
  const PRIORITIES   = ['LOW','MEDIUM','HIGH','URGENT'];
  const ROLES        = ['employee','admin','client'];

  // ── Tab rendering ────────────────────────────────────────────────────────────
  function renderTabs() {
    const active = State.getActiveTab();
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === active));
    document.querySelectorAll('.module-pane').forEach(pane =>
      pane.style.display = pane.id === `${active}-pane` ? 'flex' : 'none');
    Notify.updateTabBadge();
  }

  function renderSyncTime(d) {
    const el = document.getElementById('sync-time');
    if (el) el.textContent = d ? `Synced ${relTime(d.toISOString())}` : 'Syncing…';
  }

  function renderSoundToggle(on) {
    const btn = document.getElementById('sound-toggle');
    if (btn) { btn.textContent = on ? '🔔 Sound':'🔕 Muted'; btn.setAttribute('aria-pressed', on); }
  }

  function renderUserChip(user) {
    const av = document.getElementById('user-avatar');
    const nm = document.getElementById('user-name');
    const rb = document.getElementById('user-role-badge');
    if (av) av.textContent = user.avatar || initials(user.name);
    if (nm) nm.textContent = user.name;
    if (rb) { rb.textContent = user.role; rb.className = `role-badge role-${user.role}`; }
  }

  function showError(msg) {
    const el = document.getElementById('error-toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 5000);
  }

  function showSuccess(msg) {
    const el = document.getElementById('success-toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ── Generic list renderer ────────────────────────────────────────────────────
  function _renderList(containerId, items, activeId, rowBuilder) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rendered = new Set();
    items.forEach(item => {
      rendered.add(item.id);
      let row = container.querySelector(`[data-id="${item.id}"]`);
      const isNew = !row;
      if (isNew) {
        row = document.createElement('div');
        row.dataset.id = item.id;
        row.setAttribute('role','option'); row.setAttribute('tabindex','0');
        row.addEventListener('click', () => State.emit('ui:select', { tab: containerId.replace('-list',''), id: item.id }));
        row.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') State.emit('ui:select',{tab:containerId.replace('-list',''),id:item.id}); });
      }
      rowBuilder(row, item, item.id === activeId);
      if (isNew) container.appendChild(row);
    });
    [...container.querySelectorAll('[data-id]')].forEach(el => { if (!rendered.has(el.dataset.id)) el.remove(); });
    items.forEach((item, i) => {
      const row = container.querySelector(`[data-id="${item.id}"]`);
      if (row && container.children[i] !== row) container.insertBefore(row, container.children[i]);
    });
  }

  function _setDetail(emptyId, bodyId, html) {
    const empty = document.getElementById(emptyId);
    const body  = document.getElementById(bodyId);
    if (!empty || !body) return;
    if (html === null) { empty.style.display='flex'; body.style.display='none'; body.innerHTML=''; }
    else { empty.style.display='none'; body.style.display='flex'; body.innerHTML=html; }
  }

  // ════════════════════════════════════════════════════════════════
  // INQUIRIES
  // ════════════════════════════════════════════════════════════════
  function renderInquiryList() {
    const items    = State.getFilteredInquiries();
    const activeId = State.getActiveId('inquiries');
    const countEl  = document.getElementById('inq-count');
    if (countEl) countEl.textContent = `${items.length} inquiries`;
    Notify.updateTabBadge();
    _renderList('inquiries-list', items, activeId, (row, inq, active) => {
      const overdue = State.isInquiryOverdue(inq);
      row.className = ['inquiry-row', active?'active':'', !inq._read&&!active?'unread':'', overdue?'overdue':''].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar status-inq-${(inq.status||'').toLowerCase()}"></div>
        <div class="row-body">
          <div class="row-top"><span class="row-name">${esc(inq.name)}</span><span class="row-time">${relTime(inq.created_at)}</span></div>
          <div class="row-service">${esc(inq.subject||inq.company||'')} ${inq.company?'· '+esc(inq.company):''}</div>
          <div class="row-chips">
            ${priChip(inq.priority)}
            ${statusChip(inq.status,'inq-')}
            ${overdue?'<span class="chip chip-danger">Overdue</span>':''}
          </div>
        </div>`;
    });
  }

  function renderInquiryDetail(id) {
    const inq  = State.getInquiry(id);
    const user = State.getCurrentUser();
    if (!inq) { _setDetail('inq-empty','inq-detail-body',null); return; }
    const canEdit = can('updateStatus', user);
    const canAsgn = can('assign', user);
    const canDel  = can('deleteRecords', user);
    _setDetail('inq-empty','inq-detail-body', `
      <div class="detail-header">
        <div class="avatar">${initials(inq.name)}</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(inq.name)}</h2>
          <p class="detail-sub">${esc(inq.email)} ${inq.phone?'· '+esc(inq.phone):''} ${inq.company?'· '+esc(inq.company):''}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">${priChip(inq.priority)}${statusChip(inq.status,'inq-')}</div>
      </div>
      <div class="detail-actions">
        <a href="tel:${esc(inq.phone||'')}" class="btn btn-primary">Call</a>
        <a href="https://wa.me/${(inq.phone||'').replace(/\D/g,'')}" target="_blank" class="btn btn-whatsapp">WhatsApp</a>
        <a href="mailto:${esc(inq.email)}" class="btn btn-ghost">Email</a>
        ${canDel?`<button class="btn btn-danger" id="inq-del-btn">Delete</button>`:''}
      </div>
      <div class="detail-section">
        <div class="section-label">Subject</div>
        <p style="font-size:14px;color:var(--t-pri);font-weight:500">${esc(inq.subject||'—')}</p>
      </div>
      <div class="detail-section">
        <div class="section-label">Message</div>
        <blockquote class="message-block">${esc(inq.message||'—')}</blockquote>
      </div>
      <div class="detail-section">
        <div class="section-label">Info</div>
        <table class="info-table"><tbody>
          <tr><td>Received</td><td>${fullDate(inq.created_at)}</td></tr>
          <tr><td>Updated</td><td>${fullDate(inq.updated_at)}</td></tr>
          ${inq.notes?`<tr><td>Notes</td><td>${esc(inq.notes)}</td></tr>`:''}
        </tbody></table>
      </div>
      <div class="detail-section">
        <div class="section-label">Status &amp; Assignment</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Status</span>
            <select id="inq-status-sel" ${!canEdit?'disabled':''}>
              ${INQ_STATUSES.map(s=>`<option value="${s}" ${inq.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Priority</span>
            <select id="inq-pri-sel" ${!canEdit?'disabled':''}>
              ${PRIORITIES.map(p=>`<option value="${p}" ${inq.priority===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Notes</span>
            <input id="inq-notes-inp" type="text" value="${esc(inq.notes||'')}" placeholder="Add notes…" style="min-width:180px" ${!canEdit?'disabled':''}/>
          </label>
        </div>
        ${!canEdit?'<p class="perm-note">View-only access.</p>':''}
      </div>`);

    if (canEdit) {
      document.getElementById('inq-status-sel')?.addEventListener('change', e =>
        State.emit('action:inquiryPatch', { id:inq.id, payload:{ status:e.target.value } }));
      document.getElementById('inq-pri-sel')?.addEventListener('change', e =>
        State.emit('action:inquiryPatch', { id:inq.id, payload:{ priority:e.target.value } }));
      document.getElementById('inq-notes-inp')?.addEventListener('change', e =>
        State.emit('action:inquiryPatch', { id:inq.id, payload:{ notes:e.target.value } }));
    }
    if (canDel) {
      document.getElementById('inq-del-btn')?.addEventListener('click', () => {
        if (confirm(`Delete inquiry from ${inq.name}? This cannot be undone.`))
          State.emit('action:inquiryDelete', inq.id);
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // TICKETS
  // ════════════════════════════════════════════════════════════════
  function renderTicketList() {
    const items    = State.getFilteredTickets();
    const activeId = State.getActiveId('tickets');
    const countEl  = document.getElementById('tkt-count');
    if (countEl) countEl.textContent = `${items.length} tickets`;
    Notify.updateTabBadge();
    _renderList('tickets-list', items, activeId, (row, tkt, active) => {
      const overdue = State.isTicketOverdue(tkt);
      row.className = ['ticket-row', active?'active':'', !tkt._read&&!active?'unread':'', overdue?'overdue':''].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar pri-${(tkt.priority||'').toLowerCase()}"></div>
        <div class="row-body">
          <div class="row-top"><span class="row-name">${esc(tkt.title)}</span><span class="row-time">${relTime(tkt.created_at)}</span></div>
          <div class="row-service">Client ID: ${esc(tkt.client_id||'—')}</div>
          <div class="row-chips">
            ${priChip(tkt.priority)}
            ${statusChip(tkt.status,'tkt-')}
            ${overdue?'<span class="chip chip-danger">Overdue</span>':''}
          </div>
        </div>`;
    });
  }

  function renderTicketDetail(id) {
    const tkt  = State.getTicket(id);
    const user = State.getCurrentUser();
    if (!tkt) { _setDetail('tkt-empty','tkt-detail-body',null); return; }
    const canEdit = can('updateStatus', user);
    const canAsgn = can('assign', user);
    const canDel  = can('deleteRecords', user);
    _setDetail('tkt-empty','tkt-detail-body', `
      <div class="detail-header">
        <div class="avatar avatar-tkt">${initials('T K')}</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(tkt.title)}</h2>
          <p class="detail-sub">Client: ${esc(tkt.client_id||'—')} ${tkt.project_id?'· Project: '+esc(tkt.project_id):''}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${priChip(tkt.priority)}${statusChip(tkt.status,'tkt-')}</div>
      </div>
      <div class="detail-actions">
        ${canEdit?`
          <button class="btn btn-secondary" id="tkt-take-btn" ${tkt.status!=='OPEN'?'disabled':''}>Take Ownership</button>
          <button class="btn btn-success"   id="tkt-resolve-btn" ${['RESOLVED','CLOSED'].includes(tkt.status)?'disabled':''}>Resolve</button>
          <button class="btn btn-ghost"     id="tkt-close-btn"   ${tkt.status==='CLOSED'?'disabled':''}>Close</button>
        `:'<span class="perm-note">View-only</span>'}
        ${canDel?`<button class="btn btn-danger" id="tkt-del-btn">Delete</button>`:''}
      </div>
      <div class="detail-section">
        <div class="section-label">Description</div>
        <blockquote class="message-block">${esc(tkt.description||'—')}</blockquote>
      </div>
      <div class="detail-section">
        <div class="section-label">Info</div>
        <table class="info-table"><tbody>
          <tr><td>Opened</td><td>${fullDate(tkt.created_at)}</td></tr>
          <tr><td>Updated</td><td>${fullDate(tkt.updated_at)}</td></tr>
          ${tkt.resolution?`<tr><td>Resolution</td><td>${esc(tkt.resolution)}</td></tr>`:''}
        </tbody></table>
      </div>
      <div class="detail-section">
        <div class="section-label">Update</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Status</span>
            <select id="tkt-status-sel" ${!canEdit?'disabled':''}>
              ${TKT_STATUSES.map(s=>`<option value="${s}" ${tkt.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Priority</span>
            <select id="tkt-pri-sel" ${!canEdit?'disabled':''}>
              ${PRIORITIES.map(p=>`<option value="${p}" ${tkt.priority===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Resolution note</span>
            <input id="tkt-res-inp" type="text" value="${esc(tkt.resolution||'')}" placeholder="Resolution…" style="min-width:180px" ${!canEdit?'disabled':''}/>
          </label>
        </div>
      </div>`);

    if (canEdit) {
      document.getElementById('tkt-take-btn')?.addEventListener('click', () =>
        State.emit('action:ticketPatch', { id:tkt.id, payload:{ status:'IN_PROGRESS' } }));
      document.getElementById('tkt-resolve-btn')?.addEventListener('click', () =>
        State.emit('action:ticketPatch', { id:tkt.id, payload:{ status:'RESOLVED' } }));
      document.getElementById('tkt-close-btn')?.addEventListener('click', () =>
        State.emit('action:ticketPatch', { id:tkt.id, payload:{ status:'CLOSED' } }));
      document.getElementById('tkt-status-sel')?.addEventListener('change', e =>
        State.emit('action:ticketPatch', { id:tkt.id, payload:{ status:e.target.value } }));
      document.getElementById('tkt-pri-sel')?.addEventListener('change', e =>
        State.emit('action:ticketPatch', { id:tkt.id, payload:{ priority:e.target.value } }));
      document.getElementById('tkt-res-inp')?.addEventListener('change', e =>
        State.emit('action:ticketPatch', { id:tkt.id, payload:{ resolution:e.target.value } }));
    }
    if (canDel) {
      document.getElementById('tkt-del-btn')?.addEventListener('click', () => {
        if (confirm('Delete this ticket? This cannot be undone.'))
          State.emit('action:ticketDelete', tkt.id);
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // PROJECTS
  // ════════════════════════════════════════════════════════════════
  function renderProjectList() {
    const items    = State.getFilteredProjects();
    const activeId = State.getActiveId('projects');
    const countEl  = document.getElementById('proj-count');
    if (countEl) countEl.textContent = `${items.length} projects`;
    _renderList('projects-list', items, activeId, (row, p, active) => {
      row.className = ['project-row', active?'active':''].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar status-prj-${(p.status||'').toLowerCase().replace('_','-')}"></div>
        <div class="row-body">
          <div class="row-top"><span class="row-name">${esc(p.title)}</span><span class="row-time">${relTime(p.created_at)}</span></div>
          <div class="row-service">${p.budget?money(p.budget)+' budget ·':''} ${esc(p.end_date||'no end date')}</div>
          <div class="row-chips">${priChip(p.priority)}${statusChip(p.status,'prj-')}</div>
        </div>`;
    });
  }

  function renderProjectDetail(id) {
    const p    = State.getProject(id);
    const user = State.getCurrentUser();
    if (!p) { _setDetail('proj-empty','proj-detail-body',null); return; }
    const canEdit = can('createProject', user);
    const canDel  = can('deleteRecords', user);
    _setDetail('proj-empty','proj-detail-body', `
      <div class="detail-header">
        <div class="avatar" style="background:#0F6E56">PR</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(p.title)}</h2>
          <p class="detail-sub">Client: ${esc(p.client_id||'—')} · Budget: ${money(p.budget)}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${priChip(p.priority)}${statusChip(p.status,'prj-')}</div>
      </div>
      <div class="detail-actions">
        ${canDel?`<button class="btn btn-danger" id="proj-del-btn">Delete Project</button>`:''}
      </div>
      <div class="detail-section">
        <div class="section-label">Description</div>
        <blockquote class="message-block">${esc(p.description||'—')}</blockquote>
      </div>
      <div class="detail-section">
        <div class="section-label">Details</div>
        <table class="info-table"><tbody>
          <tr><td>Start</td><td>${p.start_date||'—'}</td></tr>
          <tr><td>End</td><td>${p.end_date||'—'}</td></tr>
          <tr><td>Budget</td><td>${money(p.budget)}</td></tr>
          <tr><td>Created</td><td>${fullDate(p.created_at)}</td></tr>
        </tbody></table>
      </div>
      <div class="detail-section">
        <div class="section-label">Update Status</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Status</span>
            <select id="proj-status-sel" ${!canEdit?'disabled':''}>
              ${PRJ_STATUSES.map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Priority</span>
            <select id="proj-pri-sel" ${!canEdit?'disabled':''}>
              ${PRIORITIES.map(s=>`<option value="${s}" ${p.priority===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>`);

    if (canEdit) {
      document.getElementById('proj-status-sel')?.addEventListener('change', e =>
        State.emit('action:projectPatch', { id:p.id, payload:{ status:e.target.value } }));
      document.getElementById('proj-pri-sel')?.addEventListener('change', e =>
        State.emit('action:projectPatch', { id:p.id, payload:{ priority:e.target.value } }));
    }
    if (canDel) {
      document.getElementById('proj-del-btn')?.addEventListener('click', () => {
        if (confirm('Delete this project? This cannot be undone.'))
          State.emit('action:projectDelete', p.id);
      });
    }
  }

  function renderCreateProjectForm() {
    _setDetail('proj-empty','proj-detail-body', `
      <div style="padding:4px 0 18px"><h3 style="font-size:15px;font-weight:600;color:var(--t-pri)">Create New Project</h3></div>
      <div class="form-fields">
        <label class="control-group wide"><span class="control-label">Title *</span><input id="cf-title" type="text" placeholder="Project title"/></label>
        <label class="control-group wide"><span class="control-label">Description</span><textarea id="cf-desc" rows="3" placeholder="Project description…"></textarea></label>
        <label class="control-group"><span class="control-label">Client ID *</span><input id="cf-client" type="text" placeholder="Client UUID"/></label>
        <label class="control-group"><span class="control-label">Assigned To (UUID)</span><input id="cf-assign" type="text" placeholder="Employee UUID"/></label>
        <label class="control-group"><span class="control-label">Priority</span>
          <select id="cf-priority">${PRIORITIES.map(p=>`<option value="${p}">${p}</option>`).join('')}</select>
        </label>
        <label class="control-group"><span class="control-label">Budget</span><input id="cf-budget" type="number" placeholder="0.00"/></label>
        <label class="control-group"><span class="control-label">Start Date</span><input id="cf-start" type="date"/></label>
        <label class="control-group"><span class="control-label">End Date</span><input id="cf-end" type="date"/></label>
      </div>
      <div class="detail-actions" style="margin-top:18px">
        <button class="btn btn-primary" id="cf-submit-btn">Create Project</button>
        <button class="btn btn-ghost"   id="cf-cancel-btn">Cancel</button>
      </div>`);

    document.getElementById('cf-submit-btn')?.addEventListener('click', () => {
      const title = document.getElementById('cf-title')?.value?.trim();
      const client_id = document.getElementById('cf-client')?.value?.trim();
      if (!title || !client_id) return showError('Title and Client ID are required.');
      State.emit('action:projectCreate', {
        title, client_id,
        description:  document.getElementById('cf-desc')?.value?.trim() || undefined,
        assigned_to:  document.getElementById('cf-assign')?.value?.trim() || undefined,
        priority:     document.getElementById('cf-priority')?.value,
        budget:       parseFloat(document.getElementById('cf-budget')?.value) || undefined,
        start_date:   document.getElementById('cf-start')?.value || undefined,
        end_date:     document.getElementById('cf-end')?.value || undefined,
      });
    });
    document.getElementById('cf-cancel-btn')?.addEventListener('click', () =>
      _setDetail('proj-empty','proj-detail-body',null));
  }

  // ════════════════════════════════════════════════════════════════
  // PROJECT REQUESTS
  // ════════════════════════════════════════════════════════════════
  function renderProjectRequestList() {
    const items    = State.getFilteredProjectRequests();
    const activeId = State.getActiveId('projectRequests');
    const countEl  = document.getElementById('req-count');
    if (countEl) countEl.textContent = `${items.length} requests`;
    _renderList('requests-list', items, activeId, (row, r, active) => {
      row.className = ['request-row', active?'active':''].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar status-req-${(r.status||'').toLowerCase().replace('_','-')}"></div>
        <div class="row-body">
          <div class="row-top"><span class="row-name">${esc(r.title)}</span><span class="row-time">${relTime(r.created_at)}</span></div>
          <div class="row-service">Budget: ${esc(r.budget_range||'—')} · ${esc(r.timeline||'—')}</div>
          <div class="row-chips">${priChip(r.priority)}${statusChip(r.status,'req-')}</div>
        </div>`;
    });
  }

  function renderProjectRequestDetail(id) {
    const r    = State.getProjectRequest(id);
    const user = State.getCurrentUser();
    if (!r) { _setDetail('req-empty','req-detail-body',null); return; }
    const canReview = can('reviewRequests', user);
    _setDetail('req-empty','req-detail-body', `
      <div class="detail-header">
        <div class="avatar" style="background:#3C3489">RQ</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(r.title)}</h2>
          <p class="detail-sub">Budget: ${esc(r.budget_range||'—')} · Timeline: ${esc(r.timeline||'—')}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${priChip(r.priority)}${statusChip(r.status,'req-')}</div>
      </div>
      <div class="detail-section"><div class="section-label">Description</div>
        <blockquote class="message-block">${esc(r.description||'—')}</blockquote></div>
      <div class="detail-section"><div class="section-label">Requirements</div>
        <blockquote class="message-block">${esc(r.requirements||'—')}</blockquote></div>
      <div class="detail-section"><div class="section-label">Info</div>
        <table class="info-table"><tbody>
          <tr><td>Client</td><td>${esc(r.client_id||'—')}</td></tr>
          <tr><td>Submitted</td><td>${fullDate(r.created_at)}</td></tr>
          ${r.review_notes?`<tr><td>Review Notes</td><td>${esc(r.review_notes)}</td></tr>`:''}
          ${r.converted_project_id?`<tr><td>Project</td><td>${esc(r.converted_project_id)}</td></tr>`:''}
        </tbody></table>
      </div>
      ${canReview?`
      <div class="detail-section"><div class="section-label">Review &amp; Decision</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Status</span>
            <select id="req-status-sel">
              ${REQ_STATUSES.map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Priority</span>
            <select id="req-pri-sel">
              ${PRIORITIES.map(p=>`<option value="${p}" ${r.priority===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </label>
          <label class="control-group wide"><span class="control-label">Review Notes</span>
            <textarea id="req-notes-inp" rows="2" placeholder="Add review notes…">${esc(r.review_notes||'')}</textarea>
          </label>
          <label class="control-group"><span class="control-label">Converted Project ID</span>
            <input id="req-proj-inp" type="text" value="${esc(r.converted_project_id||'')}" placeholder="UUID if approved…"/>
          </label>
        </div>
        <div class="detail-actions" style="margin-top:12px">
          <button class="btn btn-primary" id="req-save-btn">Save Review</button>
        </div>
      </div>`:''}
    `);

    if (canReview) {
      document.getElementById('req-save-btn')?.addEventListener('click', () => {
        const payload = {
          status:               document.getElementById('req-status-sel')?.value,
          priority:             document.getElementById('req-pri-sel')?.value,
          review_notes:         document.getElementById('req-notes-inp')?.value?.trim() || undefined,
          converted_project_id: document.getElementById('req-proj-inp')?.value?.trim() || undefined,
        };
        State.emit('action:requestPatch', { id:r.id, payload });
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // INVOICES
  // ════════════════════════════════════════════════════════════════
  function renderInvoiceList() {
    const items    = State.getFilteredInvoices();
    const activeId = State.getActiveId('invoices');
    const countEl  = document.getElementById('inv-count');
    if (countEl) countEl.textContent = `${items.length} invoices`;
    _renderList('invoices-list', items, activeId, (row, inv, active) => {
      row.className = ['invoice-row', active?'active':''].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar status-inv-${(inv.status||'').toLowerCase()}"></div>
        <div class="row-body">
          <div class="row-top"><span class="row-num">${esc(inv.invoice_number||'—')}</span><span class="row-time">${relTime(inv.created_at)}</span></div>
          <div class="row-name">${esc(inv.title)}</div>
          <div class="row-service">${money(inv.total_amount, inv.currency)} · Due ${inv.due_date||'—'}</div>
          <div class="row-chips">${statusChip(inv.status,'inv-')}</div>
        </div>`;
    });
  }

  function renderInvoiceDetail(id) {
    const inv  = State.getInvoice(id);
    const user = State.getCurrentUser();
    if (!inv) { _setDetail('inv-empty','inv-detail-body',null); return; }
    const canEdit   = can('createInvoice', user);
    const canUpload = can('uploadInvoice', user);
    const canDel    = can('deleteRecords', user);
    _setDetail('inv-empty','inv-detail-body', `
      <div class="detail-header">
        <div class="avatar" style="background:#854F0B">INV</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(inv.invoice_number||'—')}</h2>
          <p class="detail-sub">${esc(inv.title)} · Client: ${esc(inv.client_id||'—')}</p>
        </div>
        ${statusChip(inv.status,'inv-')}
      </div>
      <div class="detail-actions">
        ${inv.file_url?`<a href="${esc(inv.file_url)}" target="_blank" class="btn btn-ghost">View PDF</a>`:''}
        <button class="btn btn-secondary" id="inv-download-btn">Get Download Link</button>
        ${canUpload?`<label class="btn btn-secondary" style="cursor:pointer">Upload PDF<input type="file" accept=".pdf" id="inv-upload-inp" style="display:none"/></label>`:''}
        ${canDel?`<button class="btn btn-danger" id="inv-del-btn">Delete</button>`:''}
      </div>
      <div class="detail-section"><div class="section-label">Details</div>
        <table class="info-table"><tbody>
          <tr><td>Amount</td><td>${money(inv.amount, inv.currency)}</td></tr>
          <tr><td>Tax (${inv.tax_rate||0}%)</td><td>${money(inv.tax_amount, inv.currency)}</td></tr>
          <tr><td>Total</td><td style="font-weight:600;color:var(--t-pri)">${money(inv.total_amount, inv.currency)}</td></tr>
          <tr><td>Currency</td><td>${esc(inv.currency||'—')}</td></tr>
          <tr><td>Due Date</td><td>${esc(inv.due_date||'—')}</td></tr>
          ${inv.paid_at?`<tr><td>Paid At</td><td>${fullDate(inv.paid_at)}</td></tr>`:''}
          <tr><td>Created</td><td>${fullDate(inv.created_at)}</td></tr>
        </tbody></table>
      </div>
      ${inv.description?`<div class="detail-section"><div class="section-label">Description</div><blockquote class="message-block">${esc(inv.description)}</blockquote></div>`:''}
      ${inv.notes?`<div class="detail-section"><div class="section-label">Notes</div><blockquote class="message-block">${esc(inv.notes)}</blockquote></div>`:''}
      ${canEdit?`
      <div class="detail-section"><div class="section-label">Update</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Status</span>
            <select id="inv-status-sel">
              ${INV_STATUSES.map(s=>`<option value="${s}" ${inv.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Due Date</span>
            <input id="inv-due-inp" type="date" value="${esc(inv.due_date||'')}"/>
          </label>
        </div>
      </div>`:''}
    `);

    document.getElementById('inv-download-btn')?.addEventListener('click', () =>
      State.emit('action:invoiceDownload', inv.id));
    if (canEdit) {
      document.getElementById('inv-status-sel')?.addEventListener('change', e =>
        State.emit('action:invoicePatch', { id:inv.id, payload:{ status:e.target.value } }));
      document.getElementById('inv-due-inp')?.addEventListener('change', e =>
        State.emit('action:invoicePatch', { id:inv.id, payload:{ due_date:e.target.value } }));
    }
    if (canUpload) {
      document.getElementById('inv-upload-inp')?.addEventListener('change', e => {
        if (e.target.files[0]) State.emit('action:invoiceUpload', { id:inv.id, file:e.target.files[0] });
      });
    }
    if (canDel) {
      document.getElementById('inv-del-btn')?.addEventListener('click', () => {
        if (confirm('Delete this invoice? This cannot be undone.'))
          State.emit('action:invoiceDelete', inv.id);
      });
    }
  }

  function renderCreateInvoiceForm() {
    _setDetail('inv-empty','inv-detail-body', `
      <div style="padding:4px 0 18px"><h3 style="font-size:15px;font-weight:600;color:var(--t-pri)">Create Invoice</h3></div>
      <div class="form-fields">
        <label class="control-group wide"><span class="control-label">Title *</span><input id="if-title" type="text" placeholder="Invoice title"/></label>
        <label class="control-group wide"><span class="control-label">Description</span><textarea id="if-desc" rows="2" placeholder="Description…"></textarea></label>
        <label class="control-group"><span class="control-label">Client ID *</span><input id="if-client" type="text" placeholder="Client UUID"/></label>
        <label class="control-group"><span class="control-label">Project ID</span><input id="if-project" type="text" placeholder="Project UUID"/></label>
        <label class="control-group"><span class="control-label">Amount *</span><input id="if-amount" type="number" step="0.01" placeholder="0.00"/></label>
        <label class="control-group"><span class="control-label">Tax Rate (%)</span><input id="if-tax" type="number" step="0.1" value="0"/></label>
        <label class="control-group"><span class="control-label">Currency</span><input id="if-currency" type="text" value="USD" maxlength="3"/></label>
        <label class="control-group"><span class="control-label">Due Date *</span><input id="if-due" type="date"/></label>
        <label class="control-group wide"><span class="control-label">Notes</span><textarea id="if-notes" rows="2" placeholder="Payment instructions…"></textarea></label>
      </div>
      <div class="detail-actions" style="margin-top:18px">
        <button class="btn btn-primary" id="if-submit-btn">Create Invoice</button>
        <button class="btn btn-ghost"   id="if-cancel-btn">Cancel</button>
      </div>`);

    document.getElementById('if-submit-btn')?.addEventListener('click', () => {
      const title     = document.getElementById('if-title')?.value?.trim();
      const client_id = document.getElementById('if-client')?.value?.trim();
      const amount    = parseFloat(document.getElementById('if-amount')?.value);
      const due_date  = document.getElementById('if-due')?.value;
      if (!title || !client_id || !amount || !due_date) return showError('Title, Client ID, Amount, and Due Date are required.');
      State.emit('action:invoiceCreate', {
        title, client_id, amount, due_date,
        description: document.getElementById('if-desc')?.value?.trim() || undefined,
        project_id:  document.getElementById('if-project')?.value?.trim() || undefined,
        tax_rate:    parseFloat(document.getElementById('if-tax')?.value) || 0,
        currency:    document.getElementById('if-currency')?.value?.trim() || 'USD',
        notes:       document.getElementById('if-notes')?.value?.trim() || undefined,
      });
    });
    document.getElementById('if-cancel-btn')?.addEventListener('click', () =>
      _setDetail('inv-empty','inv-detail-body',null));
  }

  // ════════════════════════════════════════════════════════════════
  // USERS  (admin only)
  // ════════════════════════════════════════════════════════════════
  function renderUserList() {
    const items    = State.getAllUsers();
    const activeId = State.getActiveId('users');
    const countEl  = document.getElementById('usr-count');
    if (countEl) countEl.textContent = `${items.length} users`;
    _renderList('users-list', items, activeId, (row, u, active) => {
      row.className = ['user-row', active?'active':''].filter(Boolean).join(' ');
      row.innerHTML = `
        <div class="row-bar" style="background:${u.role==='admin'?'var(--c-amber)':u.role==='employee'?'var(--c-blue)':'var(--c-green)'}"></div>
        <div class="row-body">
          <div class="row-top"><span class="row-name">${esc(u.full_name)}</span><span class="row-time">${relTime(u.created_at)}</span></div>
          <div class="row-service">${esc(u.email)} ${u.phone?'· '+esc(u.phone):''}</div>
          <div class="row-chips">
            <span class="chip role-chip-${u.role}">${u.role}</span>
            ${u.is_active?'<span class="chip chip-success">Active</span>':'<span class="chip chip-danger">Inactive</span>'}
            ${u.is_verified?'<span class="chip chip-muted">Verified</span>':'<span class="chip chip-muted">Unverified</span>'}
          </div>
        </div>`;
    });
  }

  function renderUserDetail(id) {
    const u    = State.getUser(id);
    const user = State.getCurrentUser();
    if (!u) { _setDetail('usr-empty','usr-detail-body',null); return; }
    const canManage = can('manageUsers', user);
    _setDetail('usr-empty','usr-detail-body', `
      <div class="detail-header">
        <div class="avatar" style="background:${u.role==='admin'?'#854F0B':u.role==='employee'?'#185FA5':'#0F6E56'}">${initials(u.full_name)}</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(u.full_name)}</h2>
          <p class="detail-sub">${esc(u.email)} ${u.phone?'· '+esc(u.phone):''}</p>
        </div>
        <span class="role-badge role-${u.role}">${u.role}</span>
      </div>
      <div class="detail-section"><div class="section-label">Account Info</div>
        <table class="info-table"><tbody>
          <tr><td>ID</td><td style="font-family:var(--font-mono);font-size:11px">${esc(u.id)}</td></tr>
          <tr><td>Active</td><td>${u.is_active?'Yes':'No'}</td></tr>
          <tr><td>Verified</td><td>${u.is_verified?'Yes':'No'}</td></tr>
          <tr><td>Created</td><td>${fullDate(u.created_at)}</td></tr>
          <tr><td>Updated</td><td>${fullDate(u.updated_at)}</td></tr>
        </tbody></table>
      </div>
      ${canManage?`
      <div class="detail-section"><div class="section-label">Manage Account</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Role</span>
            <select id="usr-role-sel">
              ${ROLES.map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
            </select>
          </label>
          <label class="control-group"><span class="control-label">Active</span>
            <select id="usr-active-sel">
              <option value="true" ${u.is_active?'selected':''}>Active</option>
              <option value="false" ${!u.is_active?'selected':''}>Inactive</option>
            </select>
          </label>
          <label class="control-group"><span class="control-label">Verified</span>
            <select id="usr-verified-sel">
              <option value="true" ${u.is_verified?'selected':''}>Verified</option>
              <option value="false" ${!u.is_verified?'selected':''}>Unverified</option>
            </select>
          </label>
        </div>
        <div class="detail-actions" style="margin-top:12px">
          <button class="btn btn-primary" id="usr-save-btn">Save Changes</button>
        </div>
      </div>`:''}
    `);

    if (canManage) {
      document.getElementById('usr-save-btn')?.addEventListener('click', () => {
        State.emit('action:userPatch', { id:u.id, payload:{
          role:        document.getElementById('usr-role-sel')?.value,
          is_active:   document.getElementById('usr-active-sel')?.value === 'true',
          is_verified: document.getElementById('usr-verified-sel')?.value === 'true',
        }});
      });
    }
  }

  function renderRegisterForm() {
    _setDetail('usr-empty','usr-detail-body', `
      <div style="padding:4px 0 18px"><h3 style="font-size:15px;font-weight:600;color:var(--t-pri)">Onboard New User / Client</h3></div>
      <div class="form-fields">
        <label class="control-group"><span class="control-label">Full Name *</span><input id="rf-name" type="text" placeholder="John Doe"/></label>
        <label class="control-group"><span class="control-label">Email *</span><input id="rf-email" type="email" placeholder="john@company.com"/></label>
        <label class="control-group"><span class="control-label">Phone</span><input id="rf-phone" type="tel" placeholder="+971…"/></label>
        <label class="control-group"><span class="control-label">Password *</span><input id="rf-pw" type="password" placeholder="Min 8 chars, 1 number, 1 special"/></label>
        <label class="control-group"><span class="control-label">Role *</span>
          <select id="rf-role">
            <option value="client" selected>Client (gives portal access)</option>
            <option value="employee">Employee (gives console access)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </label>
      </div>
      <p class="perm-note" style="margin-top:12px">Clients will be able to log in to the client portal with these credentials. Their account ID will be generated automatically.</p>
      <div class="detail-actions" style="margin-top:18px">
        <button class="btn btn-primary" id="rf-submit-btn">Create Account</button>
        <button class="btn btn-ghost"   id="rf-cancel-btn">Cancel</button>
      </div>`);

    document.getElementById('rf-submit-btn')?.addEventListener('click', () => {
      const full_name = document.getElementById('rf-name')?.value?.trim();
      const email     = document.getElementById('rf-email')?.value?.trim();
      const password  = document.getElementById('rf-pw')?.value;
      const role      = document.getElementById('rf-role')?.value;
      const phone     = document.getElementById('rf-phone')?.value?.trim() || undefined;
      if (!full_name || !email || !password) return showError('Name, email, and password are required.');
      State.emit('action:userRegister', { full_name, email, password, phone, role });
    });
    document.getElementById('rf-cancel-btn')?.addEventListener('click', () =>
      _setDetail('usr-empty','usr-detail-body',null));
  }

  // ════════════════════════════════════════════════════════════════
  // AUDIT LOGS  (admin only)
  // ════════════════════════════════════════════════════════════════
  function renderAuditLogs() {
    const logs    = State.getAuditLogs();
    const container = document.getElementById('audit-list');
    if (!container) return;
    const countEl = document.getElementById('audit-count');
    if (countEl) countEl.textContent = `${logs.length} logs`;

    container.innerHTML = logs.length === 0
      ? '<div class="empty-state"><p>No audit logs found.</p></div>'
      : logs.map(log => `
        <div class="audit-row">
          <div class="audit-action audit-action-${(log.action||'').toLowerCase()}">${esc(log.action||'—')}</div>
          <div class="audit-body">
            <div class="audit-top">
              <span class="audit-entity">${esc(log.entity_type||'—')} ${log.entity_id?`<span style="font-family:var(--font-mono);font-size:10px">${log.entity_id.slice(0,8)}…</span>`:''}</span>
              <span class="audit-time">${relTime(log.timestamp)}</span>
            </div>
            <div class="audit-desc">${esc(log.description||'—')}</div>
            <div class="audit-meta">
              ${log.user_id?`<span class="chip chip-muted">User: ${log.user_id.slice(0,8)}…</span>`:''}
              ${log.ip_address?`<span class="chip chip-muted">${esc(log.ip_address)}</span>`:''}
            </div>
          </div>
        </div>`).join('');
  }

  // ════════════════════════════════════════════════════════════════
  // PROFILE / SETTINGS  (all users)
  // ════════════════════════════════════════════════════════════════
  function renderProfilePanel() {
    const user = State.getCurrentUser();
    if (!user) return;
    _setDetail('profile-empty','profile-detail-body', `
      <div class="detail-header">
        <div class="avatar" style="background:#185FA5;width:52px;height:52px;font-size:18px">${esc(user.avatar)}</div>
        <div class="detail-title-block">
          <h2 class="detail-name">${esc(user.name)}</h2>
          <p class="detail-sub">${esc(user.email)}</p>
        </div>
        <span class="role-badge role-${user.role}">${user.role}</span>
      </div>
      <div class="detail-section"><div class="section-label">Edit Profile</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Full Name</span>
            <input id="pro-name" type="text" value="${esc(user.name)}"/>
          </label>
          <label class="control-group"><span class="control-label">Phone</span>
            <input id="pro-phone" type="tel" value="${esc(user.phone||'')}"/>
          </label>
        </div>
        <div class="detail-actions" style="margin-top:12px">
          <button class="btn btn-primary" id="pro-save-btn">Save Profile</button>
        </div>
      </div>
      <div class="detail-section"><div class="section-label">Change Password</div>
        <div class="controls-row">
          <label class="control-group"><span class="control-label">Current Password</span>
            <input id="pro-cur-pw" type="password" placeholder="Current password"/>
          </label>
          <label class="control-group"><span class="control-label">New Password</span>
            <input id="pro-new-pw" type="password" placeholder="New password"/>
          </label>
        </div>
        <div class="detail-actions" style="margin-top:12px">
          <button class="btn btn-secondary" id="pro-pw-btn">Change Password</button>
        </div>
      </div>`);

    document.getElementById('pro-save-btn')?.addEventListener('click', () =>
      State.emit('action:profileUpdate', {
        full_name: document.getElementById('pro-name')?.value?.trim(),
        phone:     document.getElementById('pro-phone')?.value?.trim() || undefined,
      }));
    document.getElementById('pro-pw-btn')?.addEventListener('click', () => {
      const cur = document.getElementById('pro-cur-pw')?.value;
      const nw  = document.getElementById('pro-new-pw')?.value;
      if (!cur || !nw) return showError('Both password fields are required.');
      State.emit('action:passwordChange', { current: cur, next: nw });
    });
  }

  return {
    renderTabs, renderSyncTime, renderSoundToggle, renderUserChip, showError, showSuccess,
    renderInquiryList, renderInquiryDetail,
    renderTicketList,  renderTicketDetail,
    renderProjectList, renderProjectDetail, renderCreateProjectForm,
    renderProjectRequestList, renderProjectRequestDetail,
    renderInvoiceList, renderInvoiceDetail, renderCreateInvoiceForm,
    renderUserList, renderUserDetail, renderRegisterForm,
    renderAuditLogs, renderProfilePanel,
  };
})();

export default UI;
