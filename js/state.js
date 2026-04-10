/**
 * state.js
 * Single source of truth for the entire application.
 * Manages: inquiries, tickets, projects, project-requests,
 *          invoices, users, audit logs, UI state, session user.
 */

const State = (() => {
  // ── Data stores ──────────────────────────────────────────────
  let _inquiries       = new Map();
  let _tickets         = new Map();
  let _projects        = new Map();
  let _projectRequests = new Map();
  let _invoices        = new Map();
  let _users           = new Map();
  let _auditLogs       = [];

  // ── Totals (from server pagination) ─────────────────────────
  let _totals = { inquiries: 0, tickets: 0, projects: 0, projectRequests: 0, invoices: 0, users: 0, auditLogs: 0 };

  // ── UI state ─────────────────────────────────────────────────
  let _currentUser  = null;
  let _activeTab    = 'inquiries';
  let _activeIds    = { inquiries: null, tickets: null, projects: null, projectRequests: null, invoices: null, users: null };
  let _soundEnabled = true;
  let _lastSync     = null;

  // ── Active filters per tab ───────────────────────────────────
  let _filters = {
    inquiries:       { status: null, priority: null, assigned_to: null, page: 1 },
    tickets:         { status: null, priority: null, assigned_to: null, page: 1 },
    projects:        { status: null, priority: null, assigned_to: null, page: 1 },
    projectRequests: { status: null, priority: null, page: 1 },
    invoices:        { status: null, project_id: null, page: 1 },
    users:           { page: 1 },
    auditLogs:       { action: null, entity_type: null, user_id: null, page: 1 },
  };

  // ── Event bus ────────────────────────────────────────────────
  let _listeners = {};
  function on(event, fn)  { (_listeners[event] = _listeners[event] || []).push(fn); }
  function off(event, fn) { _listeners[event] = (_listeners[event] || []).filter(f => f !== fn); }
  function emit(event, d) { (_listeners[event] || []).forEach(fn => fn(d)); }

  // ── Generic collection helpers ───────────────────────────────
  function _setCollection(map, list, totalKey, eventName) {
    const newOnes = [];
    const incoming = new Map(list.map(i => [i.id, i]));
    incoming.forEach((item, id) => {
      if (!map.has(id)) newOnes.push(item);
      else { const ex = map.get(id); incoming.set(id, { ...item, _read: ex._read }); }
    });
    // Replace map contents
    map.clear();
    incoming.forEach((v, k) => map.set(k, v));
    emit(eventName, { newOnes });
    return newOnes;
  }

  function _updateItem(map, id, patch, eventName) {
    const item = map.get(id);
    if (!item) return null;
    const updated = { ...item, ...patch };
    map.set(id, updated);
    emit(eventName, updated);
    return updated;
  }

  function _removeItem(map, id, eventName) {
    map.delete(id);
    emit(eventName + ':removed', id);
  }

  function _addItem(map, item, eventName) {
    map.set(item.id, item);
    emit(eventName + ':added', item);
  }

  // ── INQUIRIES ────────────────────────────────────────────────
  function setInquiries(list)          { return _setCollection(_inquiries, list, 'inquiries', 'inquiries:updated'); }
  function getInquiry(id)              { return _inquiries.get(id) || null; }
  function getAllInquiries()           { return [..._inquiries.values()]; }
  function updateInquiry(id, patch)    { return _updateItem(_inquiries, id, patch, 'inquiry:updated'); }
  function removeInquiry(id)           { return _removeItem(_inquiries, id, 'inquiry'); }
  function markInquiryRead(id)         { return updateInquiry(id, { _read: true }); }
  function getInquiryUnread()          { return getAllInquiries().filter(i => !i._read).length; }
  function isInquiryOverdue(inq) {
    return inq.status === 'NEW' && (Date.now() - new Date(inq.created_at)) > 15 * 60 * 1000;
  }
  function getFilteredInquiries() {
    const f = _filters.inquiries;
    const order = { NEW: 0, CONTACTED: 1, QUALIFIED: 2, CONVERTED: 3, REJECTED: 4 };
    return getAllInquiries()
      .filter(i => !f.status   || i.status   === f.status)
      .filter(i => !f.priority || i.priority === f.priority)
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.created_at) - new Date(a.created_at));
  }

  // ── TICKETS ──────────────────────────────────────────────────
  function setTickets(list)            { return _setCollection(_tickets, list, 'tickets', 'tickets:updated'); }
  function getTicket(id)               { return _tickets.get(id) || null; }
  function getAllTickets()              { return [..._tickets.values()]; }
  function updateTicket(id, patch)     { return _updateItem(_tickets, id, patch, 'ticket:updated'); }
  function removeTicket(id)            { return _removeItem(_tickets, id, 'ticket'); }
  function markTicketRead(id)          { return updateTicket(id, { _read: true }); }
  function getTicketUnread()           { return getAllTickets().filter(t => !t._read).length; }
  function isTicketOverdue(tkt) {
    if (['RESOLVED','CLOSED'].includes(tkt.status)) return false;
    const hrs = { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 72 }[tkt.priority] || 24;
    return (Date.now() - new Date(tkt.created_at)) > hrs * 3600000;
  }
  function getFilteredTickets() {
    const f = _filters.tickets;
    const order = { OPEN: 0, IN_PROGRESS: 1, WAITING_CLIENT: 2, RESOLVED: 3, CLOSED: 4 };
    const pOrd  = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return getAllTickets()
      .filter(t => !f.status   || t.status   === f.status)
      .filter(t => !f.priority || t.priority === f.priority)
      .sort((a, b) => (pOrd[a.priority] ?? 9) - (pOrd[b.priority] ?? 9) || (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }

  // ── PROJECTS ─────────────────────────────────────────────────
  function setProjects(list, total)    { _totals.projects = total || list.length; return _setCollection(_projects, list, 'projects', 'projects:updated'); }
  function getProject(id)              { return _projects.get(id) || null; }
  function getAllProjects()             { return [..._projects.values()]; }
  function addProject(item)            { return _addItem(_projects, item, 'project'); }
  function updateProject(id, patch)    { return _updateItem(_projects, id, patch, 'project:updated'); }
  function removeProject(id)           { return _removeItem(_projects, id, 'project'); }
  function getFilteredProjects() {
    const f = _filters.projects;
    return getAllProjects()
      .filter(p => !f.status   || p.status   === f.status)
      .filter(p => !f.priority || p.priority === f.priority)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // ── PROJECT REQUESTS ─────────────────────────────────────────
  function setProjectRequests(list, total)  { _totals.projectRequests = total || list.length; return _setCollection(_projectRequests, list, 'projectRequests', 'projectRequests:updated'); }
  function getProjectRequest(id)            { return _projectRequests.get(id) || null; }
  function getAllProjectRequests()           { return [..._projectRequests.values()]; }
  function updateProjectRequest(id, patch)  { return _updateItem(_projectRequests, id, patch, 'projectRequest:updated'); }
  function getFilteredProjectRequests() {
    const f = _filters.projectRequests;
    const order = { PENDING: 0, UNDER_REVIEW: 1, APPROVED: 2, REJECTED: 3, CONVERTED: 4 };
    return getAllProjectRequests()
      .filter(r => !f.status   || r.status   === f.status)
      .filter(r => !f.priority || r.priority === f.priority)
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.created_at) - new Date(a.created_at));
  }

  // ── INVOICES ─────────────────────────────────────────────────
  function setInvoices(list, total)    { _totals.invoices = total || list.length; return _setCollection(_invoices, list, 'invoices', 'invoices:updated'); }
  function getInvoice(id)              { return _invoices.get(id) || null; }
  function getAllInvoices()             { return [..._invoices.values()]; }
  function addInvoice(item)            { return _addItem(_invoices, item, 'invoice'); }
  function updateInvoice(id, patch)    { return _updateItem(_invoices, id, patch, 'invoice:updated'); }
  function removeInvoice(id)           { return _removeItem(_invoices, id, 'invoice'); }
  function getFilteredInvoices() {
    const f = _filters.invoices;
    const order = { DRAFT: 0, SENT: 1, OVERDUE: 2, PAID: 3, CANCELLED: 4 };
    return getAllInvoices()
      .filter(i => !f.status || i.status === f.status)
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.created_at) - new Date(a.created_at));
  }

  // ── USERS ────────────────────────────────────────────────────
  function setUsers(list)              { list.forEach(u => _users.set(u.id, u)); emit('users:updated', list); }
  function getUser(id)                 { return _users.get(id) || null; }
  function getAllUsers()                { return [..._users.values()]; }
  function updateUser(id, patch)       { return _updateItem(_users, id, patch, 'user:updated'); }
  function addUser(u)                  { _users.set(u.id, u); emit('user:added', u); }

  // ── AUDIT LOGS ───────────────────────────────────────────────
  function setAuditLogs(list, total)   { _auditLogs = list; _totals.auditLogs = total || list.length; emit('auditLogs:updated', list); }
  function getAuditLogs()              { return _auditLogs; }

  // ── TOTALS ───────────────────────────────────────────────────
  function getTotal(key) { return _totals[key] || 0; }

  // ── UI helpers ───────────────────────────────────────────────
  function setCurrentUser(u)          { _currentUser = u; emit('user:set', u); }
  function getCurrentUser()           { return _currentUser; }
  function setActiveTab(tab)          { _activeTab = tab; emit('tab:changed', tab); }
  function getActiveTab()             { return _activeTab; }
  function setActiveId(tab, id)       { _activeIds[tab] = id; emit(`active:${tab}`, id); }
  function getActiveId(tab)           { return _activeIds[tab]; }
  function toggleSound()              { _soundEnabled = !_soundEnabled; emit('sound:changed', _soundEnabled); return _soundEnabled; }
  function isSoundEnabled()           { return _soundEnabled; }
  function setLastSync(d)             { _lastSync = d; emit('sync:updated', d); }
  function getLastSync()              { return _lastSync; }
  function getTotalUnread()           { return getInquiryUnread() + getTicketUnread(); }

  function setFilter(tab, key, value) {
    if (!_filters[tab]) return;
    _filters[tab][key] = value;
    _filters[tab].page = 1;
    emit(`filter:${tab}`, _filters[tab]);
  }
  function getFilter(tab) { return _filters[tab] || {}; }
  function getActiveFilters() {
    return { inquiries: _filters.inquiries, tickets: _filters.tickets };
  }

  return {
    on, off, emit,
    // Inquiries
    setInquiries, getInquiry, getAllInquiries, getFilteredInquiries,
    updateInquiry, removeInquiry, markInquiryRead, getInquiryUnread, isInquiryOverdue,
    // Tickets
    setTickets, getTicket, getAllTickets, getFilteredTickets,
    updateTicket, removeTicket, markTicketRead, getTicketUnread, isTicketOverdue,
    // Projects
    setProjects, getProject, getAllProjects, addProject, updateProject, removeProject, getFilteredProjects,
    // Project Requests
    setProjectRequests, getProjectRequest, getAllProjectRequests, updateProjectRequest, getFilteredProjectRequests,
    // Invoices
    setInvoices, getInvoice, getAllInvoices, addInvoice, updateInvoice, removeInvoice, getFilteredInvoices,
    // Users
    setUsers, getUser, getAllUsers, updateUser, addUser,
    // Audit logs
    setAuditLogs, getAuditLogs,
    // Totals
    getTotal,
    // UI
    setCurrentUser, getCurrentUser,
    setActiveTab, getActiveTab,
    setActiveId, getActiveId,
    toggleSound, isSoundEnabled,
    setLastSync, getLastSync,
    getTotalUnread,
    setFilter, getFilter, getActiveFilters,
  };
})();

export default State;
