/**
 * api.js
 * All backend communication.
 *
 * Spring Boot endpoints assumed:
 *   GET    /api/inquiries
 *   PATCH  /api/inquiries/:id
 *   GET    /api/tickets
 *   PATCH  /api/tickets/:id
 *   POST   /api/tickets/:id/replies
 *   GET    /api/employees
 *   GET    /api/clients
 *
 * Set MOCK: false and BASE_URL to connect your backend.
 */

import State from './state.js';
import { getToken } from './auth.js';

export const CONFIG = {
  BASE_URL: 'https://your-backend.com/api',  // ← your Spring Boot base URL
  POLL_INTERVAL_MS: 15000,
  MOCK: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATABASE
// Remove this entire block when connecting to your real backend.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK = (() => {
  const now = Date.now();

  const inquiries = [
    { id:'inq_001', name:'Sarah Mitchell',  phone:'+971501234567', email:'sarah@email.com',   service_type:'Kitchen Renovation', message:'Looking for a full kitchen remodel, budget around 50k. Need completion within 3 months. Family of 5 so speed matters.', timestamp:new Date(now-3*60000).toISOString(),      status:'new',         assigned_to:'Unassigned', read:false, source:'website_form' },
    { id:'inq_002', name:'James Al-Farsi',  phone:'+971509876543', email:'james.af@mail.com', service_type:'Bathroom Fitting',   message:'Want to upgrade two bathrooms. Italian tiles and walk-in shower for master bath.', timestamp:new Date(now-15*60000).toISOString(),     status:'contacted',   assigned_to:'Ahmed',      read:true,  source:'website_form' },
    { id:'inq_003', name:'Priya Sharma',    phone:'+971555001122', email:'priya.s@work.com',  service_type:'Office Fitout',      message:'Full office refit for 30 staff. Modern open-plan with breakout areas.', timestamp:new Date(now-60*60000).toISOString(),     status:'in_progress', assigned_to:'Sara',       read:true,  source:'website_form' },
    { id:'inq_004', name:'Michael Tan',     phone:'+971508887766', email:'mtan@corp.ae',      service_type:'Villa Renovation',   message:'Ground floor villa renovation. Smart home integration. Budget open.', timestamp:new Date(now-120*60000).toISOString(),    status:'new',         assigned_to:'Unassigned', read:false, source:'website_form' },
    { id:'inq_005', name:'Layla Hassan',    phone:'+971503332211', email:'layla.h@gmail.com', service_type:'Interior Design',    message:'Furniture and color palette for new apartment. Move-in in 2 months.', timestamp:new Date(now-24*3600000).toISOString(),   status:'closed',      assigned_to:'Khalid',     read:true,  source:'website_form' },
    { id:'inq_006', name:'Omar Khalil',     phone:'+971506664433', email:'omar.k@outlook.com',service_type:'Kitchen Renovation', message:'Small kitchen, maximize storage and add island. Budget flexible.', timestamp:new Date(now-25*60000).toISOString(),     status:'new',         assigned_to:'Unassigned', read:false, source:'website_form' },
  ];

  const tickets = [
    {
      id:'tkt_001', ticket_number:'TKT-1001',
      client_id:'cli_001', client_name:'Priya Sharma', client_email:'priya.s@work.com',
      project:'Office Fitout — Al Quoz', category:'Delay',
      subject:'Electrical work not started on schedule',
      description:'The electrician was supposed to start on Monday but still has not shown up. This is causing a knock-on delay to plastering. Please advise on revised schedule.',
      priority:'high', status:'open',
      assigned_to:'Ahmed',
      created_at:new Date(now-2*3600000).toISOString(),
      updated_at:new Date(now-2*3600000).toISOString(),
      read:false,
      replies:[],
    },
    {
      id:'tkt_002', ticket_number:'TKT-1002',
      client_id:'cli_002', client_name:'James Al-Farsi', client_email:'james.af@mail.com',
      project:'Bathroom Renovation — JBR', category:'Material Issue',
      subject:'Wrong tile colour delivered',
      description:'The Carrara tiles delivered today are clearly cream-toned, not the Arctic White we selected in the showroom. Have photos. Need replacement before tiling can start next week.',
      priority:'critical', status:'in_progress',
      assigned_to:'Sara',
      created_at:new Date(now-30*60000).toISOString(),
      updated_at:new Date(now-10*60000).toISOString(),
      read:false,
      replies:[
        { id:'rep_001', author:'Sara', author_role:'staff', body:'Hi James, I have escalated this to the procurement team. We are sourcing a replacement batch urgently. Will update you within 2 hours.', created_at:new Date(now-10*60000).toISOString() },
      ],
    },
    {
      id:'tkt_003', ticket_number:'TKT-1003',
      client_id:'cli_003', client_name:'Michael Tan', client_email:'mtan@corp.ae',
      project:'Villa Renovation — Emirates Hills', category:'Clarification',
      subject:'Smart lighting brand selection — need guidance',
      description:'You mentioned we could go with Lutron or Crestron for the lighting control. Can you provide a comparison of what is included in each quote? I need to decide before Friday.',
      priority:'medium', status:'open',
      assigned_to:'Unassigned',
      created_at:new Date(now-5*3600000).toISOString(),
      updated_at:new Date(now-5*3600000).toISOString(),
      read:true,
      replies:[],
    },
    {
      id:'tkt_004', ticket_number:'TKT-1004',
      client_id:'cli_001', client_name:'Priya Sharma', client_email:'priya.s@work.com',
      project:'Office Fitout — Al Quoz', category:'Invoice Query',
      subject:'Invoice #2041 — unclear line item',
      description:'Line item "Provisional Sum — MEP" for AED 12,500 is not explained. What does this cover? We need documentation before approving payment.',
      priority:'low', status:'resolved',
      assigned_to:'Khalid',
      created_at:new Date(now-2*86400000).toISOString(),
      updated_at:new Date(now-86400000).toISOString(),
      read:true,
      replies:[
        { id:'rep_002', author:'Khalid', author_role:'staff', body:'The provisional sum covers any unforeseen MEP modifications inside existing risers. I have attached the breakdown. Let me know if you need anything else.', created_at:new Date(now-86400000).toISOString() },
        { id:'rep_003', author:'Priya Sharma', author_role:'client', body:'Thank you, that makes sense. Approving the invoice now.', created_at:new Date(now-80000000).toISOString() },
      ],
    },
    {
      id:'tkt_005', ticket_number:'TKT-1005',
      client_id:'cli_004', client_name:'Layla Hassan', client_email:'layla.h@gmail.com',
      project:'Apartment Interior — Downtown', category:'Snagging',
      subject:'Paint drips on feature wall — snagging item',
      description:'There are visible drip marks on the dark accent wall in the living room. This was flagged during handover but not yet fixed. Please arrange a touch-up visit.',
      priority:'medium', status:'pending',
      assigned_to:'Nour',
      created_at:new Date(now-10*3600000).toISOString(),
      updated_at:new Date(now-6*3600000).toISOString(),
      read:true,
      replies:[
        { id:'rep_004', author:'Nour', author_role:'staff', body:'Touch-up team scheduled for Thursday 9am. Please ensure access is available.', created_at:new Date(now-6*3600000).toISOString() },
      ],
    },
  ];

  let pollCount = 0;
  const newInquiryDrip = [
    { id:'inq_007', name:'Chen Wei', phone:'+971504441188', email:'chen.wei@biz.com', service_type:'Commercial Fitout', message:'Retail showroom, 800 sqm. 6 week timeline, budget 300k confirmed.', timestamp:null, status:'new', assigned_to:'Unassigned', read:false, source:'website_form' },
  ];
  const newTicketDrip = [
    {
      id:'tkt_006', ticket_number:'TKT-1006',
      client_id:'cli_002', client_name:'James Al-Farsi', client_email:'james.af@mail.com',
      project:'Bathroom Renovation — JBR', category:'Delay',
      subject:'Plumber not on site — Day 2',
      description:'The plumber has not arrived for the second consecutive day. I need to understand what is happening and get a firm commitment.',
      priority:'critical', status:'open',
      assigned_to:'Unassigned',
      created_at:null, updated_at:null, read:false, replies:[],
    },
  ];

  return {
    getInquiries() {
      pollCount++;
      if (pollCount === 3 && newInquiryDrip.length) {
        const n = { ...newInquiryDrip[0], timestamp: new Date().toISOString() };
        if (!inquiries.find(i => i.id === n.id)) inquiries.unshift(n);
      }
      return Promise.resolve([...inquiries]);
    },
    patchInquiry(id, data) {
      const idx = inquiries.findIndex(i => i.id === id);
      if (idx !== -1) Object.assign(inquiries[idx], data);
      return Promise.resolve(inquiries[idx]);
    },
    getTickets() {
      if (pollCount === 5 && newTicketDrip.length) {
        const n = { ...newTicketDrip[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        if (!tickets.find(t => t.id === n.id)) tickets.unshift(n);
      }
      return Promise.resolve([...tickets]);
    },
    patchTicket(id, data) {
      const idx = tickets.findIndex(t => t.id === id);
      if (idx !== -1) Object.assign(tickets[idx], data);
      return Promise.resolve(tickets[idx]);
    },
    postReply(ticketId, body) {
      const tkt = tickets.find(t => t.id === ticketId);
      if (!tkt) return Promise.reject('not found');
      const reply = { id: `rep_${Date.now()}`, author: 'Admin', author_role: 'staff', body, created_at: new Date().toISOString() };
      tkt.replies = [...(tkt.replies || []), reply];
      tkt.updated_at = reply.created_at;
      return Promise.resolve(reply);
    },
    getEmployees() { return Promise.resolve(['Unassigned','Ahmed','Sara','Khalid','Nour','Rami']); },
    getClients()   { return Promise.resolve([
      { id:'cli_001', name:'Priya Sharma',  email:'priya.s@work.com'  },
      { id:'cli_002', name:'James Al-Farsi',email:'james.af@mail.com' },
      { id:'cli_003', name:'Michael Tan',   email:'mtan@corp.ae'      },
      { id:'cli_004', name:'Layla Hassan',  email:'layla.h@gmail.com' },
    ]); },
  };
})();

// ─── HTTP helper ───────────────────────────────────────────────────────────────
async function http(method, path, body = null) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${CONFIG.BASE_URL}${path}`, opts);
  if (res.status === 401) {
    // Token expired or invalid — force re-login
    sessionStorage.removeItem('lc_session');
    window.location.replace('login.html');
    return null;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Public API functions ──────────────────────────────────────────────────────

// Inquiries
export async function fetchInquiries() {
  try {
    const data = CONFIG.MOCK ? await MOCK.getInquiries() : await http('GET', '/inquiries?limit=200&sort=desc');
    const newOnes = State.setInquiries(data);
    State.setLastSync(new Date());
    return newOnes;
  } catch (e) {
    console.error('[API] fetchInquiries:', e);
    State.emit('api:error', 'Could not load inquiries.');
    return [];
  }
}

export async function patchInquiry(id, data) {
  try {
    State.updateInquiry(id, data);
    return CONFIG.MOCK ? await MOCK.patchInquiry(id, data) : await http('PATCH', `/inquiries/${id}`, data);
  } catch (e) {
    console.error('[API] patchInquiry:', e);
    State.emit('api:error', 'Failed to update inquiry.');
  }
}

// Tickets
export async function fetchTickets() {
  try {
    const data = CONFIG.MOCK ? await MOCK.getTickets() : await http('GET', '/tickets?limit=200&sort=desc');
    const newOnes = State.setTickets(data);
    return newOnes;
  } catch (e) {
    console.error('[API] fetchTickets:', e);
    State.emit('api:error', 'Could not load tickets.');
    return [];
  }
}

export async function patchTicket(id, data) {
  try {
    State.updateTicket(id, data);
    return CONFIG.MOCK ? await MOCK.patchTicket(id, data) : await http('PATCH', `/tickets/${id}`, data);
  } catch (e) {
    console.error('[API] patchTicket:', e);
    State.emit('api:error', 'Failed to update ticket.');
  }
}

export async function postReply(ticketId, body) {
  try {
    const reply = CONFIG.MOCK
      ? await MOCK.postReply(ticketId, body)
      : await http('POST', `/tickets/${ticketId}/replies`, { body });
    State.addTicketReply(ticketId, reply);
    return reply;
  } catch (e) {
    console.error('[API] postReply:', e);
    State.emit('api:error', 'Failed to send reply.');
  }
}

// Employees / Clients
export async function fetchEmployees() {
  try {
    const data = CONFIG.MOCK ? await MOCK.getEmployees() : await http('GET', '/employees');
    State.setEmployees(data);
    return data;
  } catch (e) { console.error('[API] fetchEmployees:', e); }
}

export async function fetchClients() {
  try {
    const data = CONFIG.MOCK ? await MOCK.getClients() : await http('GET', '/clients');
    State.setClients(data);
    return data;
  } catch (e) { console.error('[API] fetchClients:', e); }
}

// ─── Polling ───────────────────────────────────────────────────────────────────
let _timer = null;

export function startPolling() {
  if (_timer) return;
  _timer = setInterval(async () => {
    await fetchInquiries();
    await fetchTickets();
  }, CONFIG.POLL_INTERVAL_MS);
}

export function stopPolling() { clearInterval(_timer); _timer = null; }

const API = { fetchInquiries, patchInquiry, fetchTickets, patchTicket, postReply, fetchEmployees, fetchClients, startPolling, stopPolling, CONFIG };
export default API;
