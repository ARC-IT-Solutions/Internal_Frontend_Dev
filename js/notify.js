/**
 * notify.js
 * Browser push, audio chime, tab badge, visual bar.
 * Debounced to prevent overload.
 */

import State from './state.js';

const Notify = (() => {
  let _lastInq = 0, _lastTkt = 0;
  const DEBOUNCE = 30000;

  function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default')
      Notification.requestPermission();
  }

  function _chime(freqs) {
    if (!State.isSoundEnabled()) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = f; osc.type = 'sine';
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.start(t); osc.stop(t + 0.42);
      });
    } catch {}
  }

  function updateTabBadge() {
    const total = State.getTotalUnread();
    document.title = total > 0 ? `(${total}) Lead Console` : 'Lead Console';
    _badge('unread-badge', total);
    _badge('inq-badge', State.getInquiryUnread());
    _badge('tkt-badge', State.getTicketUnread());
  }

  function _badge(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n;
    el.style.display = n > 0 ? 'inline-flex' : 'none';
  }

  function showBar(msg, type = 'inquiry') {
    const bar = document.getElementById('notif-bar');
    const txt = document.getElementById('notif-bar-text');
    const ico = document.getElementById('notif-bar-icon');
    if (!bar || !txt) return;
    txt.textContent = msg;
    bar.dataset.type = type;
    bar.classList.add('show');
    if (ico) ico.textContent = type === 'ticket' ? '🎫' : '📥';
    clearTimeout(bar._t);
    bar._t = setTimeout(() => bar.classList.remove('show'), 7000);
  }

  function hideBar() { document.getElementById('notif-bar')?.classList.remove('show'); }

  function flashRow(id) {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (!row) return;
    row.classList.remove('new-flash'); void row.offsetWidth;
    row.classList.add('new-flash');
    row.addEventListener('animationend', () => row.classList.remove('new-flash'), { once: true });
  }

  function triggerForNewInquiries(newOnes) {
    if (!newOnes?.length) return;
    updateTabBadge();
    const now = Date.now();
    if (now - _lastInq >= DEBOUNCE) {
      _lastInq = now;
      _chime([880, 1100]);
      const label = newOnes.length === 1
        ? `New inquiry: ${newOnes[0].name}`
        : `${newOnes.length} new inquiries`;
      showBar(label, 'inquiry');
      if (Notification.permission === 'granted') {
        try { new Notification('New Inquiry', { body: label, tag: 'inquiry' }); } catch {}
      }
    }
    newOnes.forEach(i => flashRow(i.id));
  }

  function triggerForNewTickets(newOnes) {
    if (!newOnes?.length) return;
    updateTabBadge();
    const now = Date.now();
    if (now - _lastTkt >= DEBOUNCE) {
      _lastTkt = now;
      _chime([660, 880, 660]);
      const label = newOnes.length === 1
        ? `New ticket: ${newOnes[0].title}`
        : `${newOnes.length} new tickets`;
      showBar(label, 'ticket');
      if (Notification.permission === 'granted') {
        try { new Notification('New Ticket', { body: label, tag: 'ticket' }); } catch {}
      }
    }
    newOnes.forEach(t => flashRow(t.id));
  }

  return { requestPermission, updateTabBadge, showBar, hideBar, flashRow, triggerForNewInquiries, triggerForNewTickets };
})();

export default Notify;
