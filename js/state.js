/**
 * state.js
 * Single source of truth.
 * Manages: inquiries, tickets, employees, UI state, sound prefs.
 * Nothing is stored in the DOM. All UI reads from here.
 */

const State = (() => {

  // ─── Internal store ────────────────────────────────────────────────────────
  let _inquiries  = new Map();
  let _tickets    = new Map();
  let _employees  = ['Unassigned'];
  let _clients    = [];                  // onboarded clients for ticket context

  let _activeTab      = 'inquiries';     // 'inquiries' | 'tickets'
  let _activeInqId    = null;
  let _activeTktId    = null;

  let _inqFilter  = 'all';
  let _tktFilter  = 'all';               // all | open | in_progress | resolved | closed
  let _tktPriFilter = 'all';            // all | low | medium | high | critical

  let _soundEnabled   = true;
  let _lastSyncTime   = null;
  let _currentUser    = null;   // set after login, { id, name, email, role, avatar, department }

  let _listeners = {};

  // ─── Event bus ─────────────────────────────────────────────────────────────
  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }
  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(f => f !== fn);
  }
  function emit(event, data) {
    (_listeners[event] || []).forEach(fn => fn(data));
  }

  // ─── Inquiries ─────────────────────────────────────────────────────────────
  function setInquiries(list) {
    const newOnes = [];
    const incoming = new Map(list.map(i => [i.id, i]));
    incoming.forEach((inq, id) => {
      if (!_inquiries.has(id)) newOnes.push(inq);
      else incoming.set(id, { ...inq, read: _inquiries.get(id).read });
    });
    _inquiries = incoming;
    emit('inquiries:updated', { newOnes });
    return newOnes;
  }

  function getInquiry(id)        { return _inquiries.get(id) || null; }
  function getAllInquiries()      { return [..._inquiries.values()]; }
  function getInquiryUnread()    { return getAllInquiries().filter(i => !i.read).length; }

  function getFilteredInquiries() {
    const order = { new: 0, in_progress: 1, contacted: 2, closed: 3 };
    return getAllInquiries()
      .filter(i => _inqFilter === 'all' || i.status === _inqFilter)
      .sort((a, b) => order[a.status] - order[b.status] || new Date(b.timestamp) - new Date(a.timestamp));
  }

  function updateInquiry(id, patch) {
    const inq = _inquiries.get(id);
    if (!inq) return null;
    const updated = { ...inq, ...patch };
    _inquiries.set(id, updated);
    emit('inquiry:updated', updated);
    return updated;
  }

  function markInquiryRead(id) { return updateInquiry(id, { read: true }); }

  function isInquiryOverdue(inq) {
    return inq.status === 'new' && (Date.now() - new Date(inq.timestamp)) > 15 * 60 * 1000;
  }

  // ─── Tickets ───────────────────────────────────────────────────────────────
  function setTickets(list) {
    const newOnes = [];
    const incoming = new Map(list.map(t => [t.id, t]));
    incoming.forEach((tkt, id) => {
      if (!_tickets.has(id)) newOnes.push(tkt);
      else incoming.set(id, { ...tkt, read: _tickets.get(id).read });
    });
    _tickets = incoming;
    emit('tickets:updated', { newOnes });
    return newOnes;
  }

  function getTicket(id)       { return _tickets.get(id) || null; }
  function getAllTickets()      { return [..._tickets.values()]; }
  function getTicketUnread()   { return getAllTickets().filter(t => !t.read).length; }

  function getFilteredTickets() {
    const order = { open: 0, in_progress: 1, pending: 2, resolved: 3, closed: 4 };
    const priOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return getAllTickets()
      .filter(t => _tktFilter === 'all' || t.status === _tktFilter)
      .filter(t => _tktPriFilter === 'all' || t.priority === _tktPriFilter)
      .sort((a, b) =>
        priOrder[a.priority] - priOrder[b.priority] ||
        order[a.status] - order[b.status] ||
        new Date(b.created_at) - new Date(a.created_at)
      );
  }

  function updateTicket(id, patch) {
    const tkt = _tickets.get(id);
    if (!tkt) return null;
    const updated = { ...tkt, ...patch };
    _tickets.set(id, updated);
    emit('ticket:updated', updated);
    return updated;
  }

  function markTicketRead(id) { return updateTicket(id, { read: true }); }

  function addTicketReply(ticketId, reply) {
    const tkt = _tickets.get(ticketId);
    if (!tkt) return null;
    const replies = [...(tkt.replies || []), reply];
    return updateTicket(ticketId, { replies });
  }

  function isTicketOverdue(tkt) {
    if (['resolved', 'closed'].includes(tkt.status)) return false;
    const limitMs = { critical: 4, high: 8, medium: 24, low: 72 }[tkt.priority] * 3600000;
    return (Date.now() - new Date(tkt.created_at)) > limitMs;
  }

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  function setActiveTab(tab)  { _activeTab = tab; emit('tab:changed', tab); }
  function getActiveTab()     { return _activeTab; }

  // ─── Active selection ──────────────────────────────────────────────────────
  function setActiveInqId(id)  { _activeInqId = id; emit('active:inq', id); }
  function getActiveInqId()    { return _activeInqId; }
  function setActiveTktId(id)  { _activeTktId = id; emit('active:tkt', id); }
  function getActiveTktId()    { return _activeTktId; }

  // ─── Filters ───────────────────────────────────────────────────────────────
  function setInqFilter(f)      { _inqFilter = f;    emit('filter:inq', f); }
  function getInqFilter()       { return _inqFilter; }
  function setTktFilter(f)      { _tktFilter = f;    emit('filter:tkt', f); }
  function getTktFilter()       { return _tktFilter; }
  function setTktPriFilter(f)   { _tktPriFilter = f; emit('filter:tkt', f); }
  function getTktPriFilter()    { return _tktPriFilter; }

  // ─── Sound ─────────────────────────────────────────────────────────────────
  function toggleSound()     { _soundEnabled = !_soundEnabled; emit('sound:changed', _soundEnabled); return _soundEnabled; }
  function isSoundEnabled()  { return _soundEnabled; }

  // ─── Sync ──────────────────────────────────────────────────────────────────
  function setLastSync(d)  { _lastSyncTime = d; emit('sync:updated', d); }
  function getLastSync()   { return _lastSyncTime; }

  // ─── Current user ──────────────────────────────────────────────────────────
  function setCurrentUser(user) { _currentUser = user; emit('user:set', user); }
  function getCurrentUser()     { return _currentUser; }

  // ─── Employees / Clients ───────────────────────────────────────────────────
  function setEmployees(list)  { _employees = list; }
  function getEmployees()      { return _employees; }
  function setClients(list)    { _clients = list; }
  function getClients()        { return _clients; }

  // ─── Combined unread ───────────────────────────────────────────────────────
  function getTotalUnread() { return getInquiryUnread() + getTicketUnread(); }

  return {
    on, off, emit,

    // Inquiries
    setInquiries, getInquiry, getAllInquiries, getFilteredInquiries,
    updateInquiry, markInquiryRead, getInquiryUnread, isInquiryOverdue,

    // Tickets
    setTickets, getTicket, getAllTickets, getFilteredTickets,
    updateTicket, markTicketRead, getTicketUnread, addTicketReply, isTicketOverdue,

    // Tabs
    setActiveTab, getActiveTab,

    // Active
    setActiveInqId, getActiveInqId,
    setActiveTktId, getActiveTktId,

    // Filters
    setInqFilter, getInqFilter,
    setTktFilter, getTktFilter,
    setTktPriFilter, getTktPriFilter,

    // Sound / Sync
    toggleSound, isSoundEnabled,
    setLastSync, getLastSync,

    // Employees / Clients
    setEmployees, getEmployees,
    setClients, getClients,

    // Current user
    setCurrentUser, getCurrentUser,

    getTotalUnread,
  };
})();

export default State;
