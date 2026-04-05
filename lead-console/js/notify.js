/**
 * notify.js
 * Notification system for both inquiries and tickets.
 * Channels: browser push, audio chime, visual bar, tab badge.
 * Anti-overload: debounced 30s per channel per type.
 */

import State from './state.js';

const Notify = (() => {
  let _lastInqNotif = 0;
  let _lastTktNotif = 0;
  const DEBOUNCE_MS = 30000;

  function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ─── Audio ─────────────────────────────────────────────────────────────────
  function _chime(freqs) {
    if (!State.isSoundEnabled()) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.start(t); osc.stop(t + 0.42);
      });
    } catch (e) {}
  }

  function chimeInquiry() { _chime([880, 1100]); }          // ascending = new lead
  function chimeTicket()  { _chime([660, 880, 660]); }      // different pattern = ticket

  // ─── Browser push ──────────────────────────────────────────────────────────
  function push(title, body, tag) {
    if (Notification.permission !== 'granted') return;
    try { new Notification(title, { body, tag, icon: '/favicon.ico' }); } catch (e) {}
  }

  // ─── Tab title badge ───────────────────────────────────────────────────────
  function updateTabBadge() {
    const total = State.getTotalUnread();
    document.title = total > 0 ? `(${total}) Lead Console` : 'Lead Console';

    // Inquiry badge
    const inqB = document.getElementById('inq-badge');
    const inqN = State.getInquiryUnread();
    if (inqB) { inqB.textContent = inqN; inqB.style.display = inqN > 0 ? 'inline-flex' : 'none'; }

    // Ticket badge
    const tktB = document.getElementById('tkt-badge');
    const tktN = State.getTicketUnread();
    if (tktB) { tktB.textContent = tktN; tktB.style.display = tktN > 0 ? 'inline-flex' : 'none'; }

    // Header unread badge
    const hdrB = document.getElementById('unread-badge');
    if (hdrB) { hdrB.textContent = total; hdrB.style.display = total > 0 ? 'inline-flex' : 'none'; }
  }

  // ─── Visual notification bar ───────────────────────────────────────────────
  function showBar(message, type = 'inquiry') {
    const bar  = document.getElementById('notif-bar');
    const text = document.getElementById('notif-bar-text');
    const icon = document.getElementById('notif-bar-icon');
    if (!bar || !text) return;
    text.textContent = message;
    bar.dataset.type = type; // CSS can style based on type
    bar.classList.add('show');
    clearTimeout(bar._t);
    bar._t = setTimeout(() => bar.classList.remove('show'), 7000);
    if (icon) icon.textContent = type === 'ticket' ? '🎫' : '📥';
  }

  function hideBar() {
    document.getElementById('notif-bar')?.classList.remove('show');
  }

  // ─── Row flash ─────────────────────────────────────────────────────────────
  function flashRow(id) {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (!row) return;
    row.classList.remove('new-flash');
    void row.offsetWidth;
    row.classList.add('new-flash');
    row.addEventListener('animationend', () => row.classList.remove('new-flash'), { once: true });
  }

  // ─── Main triggers ─────────────────────────────────────────────────────────
  function triggerForNewInquiries(newOnes) {
    if (!newOnes?.length) return;
    updateTabBadge();
    const now = Date.now();
    if (now - _lastInqNotif >= DEBOUNCE_MS) {
      _lastInqNotif = now;
      chimeInquiry();
      const label = newOnes.length === 1
        ? `New inquiry: ${newOnes[0].name} — ${newOnes[0].service_type}`
        : `${newOnes.length} new inquiries`;
      showBar(label, 'inquiry');
      push('New Inquiry', label, 'inquiry');
    }
    newOnes.forEach(i => flashRow(i.id));
  }

  function triggerForNewTickets(newOnes) {
    if (!newOnes?.length) return;
    updateTabBadge();
    const now = Date.now();
    if (now - _lastTktNotif >= DEBOUNCE_MS) {
      _lastTktNotif = now;
      chimeTicket();
      const label = newOnes.length === 1
        ? `New ticket: ${newOnes[0].client_name} — ${newOnes[0].subject}`
        : `${newOnes.length} new tickets`;
      showBar(label, 'ticket');
      push('New Support Ticket', label, 'ticket');
    }
    newOnes.forEach(t => flashRow(t.id));
  }

  return {
    requestPermission,
    updateTabBadge,
    showBar, hideBar,
    flashRow,
    triggerForNewInquiries,
    triggerForNewTickets,
  };
})();

export default Notify;
