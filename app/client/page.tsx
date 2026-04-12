import { getToken, getUser } from '@/lib/auth';
import { projectsApi, ticketsApi, invoicesApi } from '@/lib/api';
import Link from 'next/link';
import { money, shortDate, relTime } from '@/lib/utils';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ArcBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    PAID:           { bg: 'rgba(63,185,80,.1)',   text: '#5cb85c' },
    PARTIALLY_PAID: { bg: 'rgba(201,168,76,.12)', text: 'var(--arc-gold)' },
    SENT:           { bg: 'rgba(201,168,76,.08)', text: 'var(--arc-mute)' },
    OVERDUE:        { bg: 'rgba(232,107,107,.1)', text: '#e86b6b' },
    DRAFT:          { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' },
    CANCELLED:      { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' },
    IN_PROGRESS:    { bg: 'rgba(201,168,76,.1)',  text: 'var(--arc-gold)' },
    PLANNING:       { bg: 'rgba(255,255,255,.06)', text: 'var(--arc-mute)' },
    ONBOARDING:     { bg: 'rgba(201,168,76,.1)',  text: 'var(--arc-gold)' },
    COMPLETED:      { bg: 'rgba(63,185,80,.1)',   text: '#5cb85c' },
    ON_HOLD:        { bg: 'rgba(232,107,107,.08)', text: '#e86b6b' },
    REVIEW:         { bg: 'rgba(201,168,76,.12)', text: 'var(--arc-gold-lt)' },
    OPEN:           { bg: 'rgba(232,107,107,.1)', text: '#e86b6b' },
    RESOLVED:       { bg: 'rgba(63,185,80,.1)',   text: '#5cb85c' },
    CLOSED:         { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' },
    WAITING_CLIENT: { bg: 'rgba(201,168,76,.1)',  text: 'var(--arc-gold)' },
  };
  const s = map[status] ?? { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide"
      style={{ background: s.bg, color: s.text, fontFamily: 'var(--font-mono)' }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default async function ClientOverview() {
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const [projectsRes, ticketsRes, invoicesRes] = await Promise.allSettled([
    projectsApi.list(token, { page_size: 10 }),
    ticketsApi.list(token, { page_size: 6 }),
    invoicesApi.list(token, { page_size: 6 }),
  ]);

  const projects = projectsRes.status  === 'fulfilled' ? projectsRes.value.items  : [];
  const tickets  = ticketsRes.status   === 'fulfilled' ? ticketsRes.value.items   : [];
  const invoices = invoicesRes.status  === 'fulfilled' ? invoicesRes.value.items  : [];

  const overdueInvoices   = invoices.filter(i => i.status === 'OVERDUE');
  const openTickets       = tickets.filter(t => !['RESOLVED','CLOSED'].includes(t.status));
  const activeProject     = projects.find(p => p.status === 'IN_PROGRESS') ?? projects.find(p => p.status === 'ONBOARDING') ?? projects[0];
  const pendingAmount     = invoices
    .filter(i => ['SENT','PARTIALLY_PAID','OVERDUE'].includes(i.status))
    .reduce((s, i) => s + i.total_amount, 0);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.full_name.split(' ')[0];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="px-10 pt-12 pb-8" style={{ borderBottom: '1px solid var(--arc-border)' }}>
        {/* EST. label — mimics site header style */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] tracking-[.18em] uppercase"
            style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>
            CLIENT PORTAL
          </span>
          <div className="h-px w-12" style={{ background: 'var(--arc-gold)', opacity: .4 }} />
        </div>

        {/* Headline in brand serif */}
        <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-ivory)', lineHeight: 1.15, fontWeight: 700 }}
          className="text-4xl mb-2">
          {greeting}, <span style={{ color: 'var(--arc-gold)', fontStyle: 'italic' }}>{firstName}.</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--arc-mute)' }}>
          Here&apos;s the current status of your engagement with ARC IT Solutions.
        </p>
      </div>

      <div className="px-10 py-8 space-y-8">

        {/* ── Overdue alert ─────────────────────────────────────────── */}
        {overdueInvoices.length > 0 && (
          <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
            style={{ background: 'rgba(232,107,107,0.06)', border: '1px solid rgba(232,107,107,0.2)' }}>
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#e86b6b' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#e86b6b' }}>
                {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}
                {' '}— total {money(overdueInvoices.reduce((s, i) => s + i.total_amount, 0))} outstanding
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--arc-mute)' }}>
                Please contact your project manager or{' '}
                <Link href="/client/invoices" style={{ color: 'var(--arc-gold)' }} className="underline underline-offset-2">view invoices →</Link>
              </p>
            </div>
          </div>
        )}

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden"
          style={{ background: 'var(--arc-border)', border: '1px solid var(--arc-border)' }}>
          {[
            { label: 'Active Projects', value: projects.filter(p => p.status === 'IN_PROGRESS').length.toString(), italic: true },
            { label: 'Open Tickets',    value: openTickets.length.toString(), italic: true },
            { label: 'Pending Amount',  value: money(pendingAmount), italic: false },
          ].map(({ label, value, italic }) => (
            <div key={label} className="px-7 py-6"
              style={{ background: 'var(--arc-bg-card)' }}>
              <div className="text-[10px] tracking-widest uppercase mb-2"
                style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>
                {label}
              </div>
              <div style={{
                fontFamily:  'var(--font-serif)',
                fontStyle:   italic ? 'italic' : 'normal',
                color:       'var(--arc-gold)',
                fontSize:    '1.75rem',
                fontWeight:  700,
                lineHeight:  1,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Active project card ───────────────────────────────────── */}
        {activeProject && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-cream)', fontWeight: 600 }}
                  className="text-lg">
                  Your Project
                </h2>
                <div className="h-px w-8" style={{ background: 'var(--arc-gold)', opacity: .3 }} />
              </div>
              <Link href="/client/projects"
                className="text-[11px] tracking-wider flex items-center gap-1.5 transition-opacity hover:opacity-80"
                style={{ color: 'var(--arc-gold)', fontFamily: 'var(--font-sans)' }}>
                VIEW ALL <ArrowRight size={11} />
              </Link>
            </div>

            <div className="rounded-xl p-6"
              style={{ background: 'var(--arc-bg-card)', border: '1px solid var(--arc-border)' }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-ivory)', fontSize: '1.1rem', fontWeight: 600 }}>
                    {activeProject.title}
                  </h3>
                  {activeProject.description && (
                    <p className="text-sm mt-1" style={{ color: 'var(--arc-mute)' }}>
                      {activeProject.description.slice(0, 100)}{activeProject.description.length > 100 ? '…' : ''}
                    </p>
                  )}
                </div>
                <ArcBadge status={activeProject.status} />
              </div>

              {/* Progress track */}
              {(() => {
                const pct = { DRAFT:5, PLANNING:15, ONBOARDING:30, IN_PROGRESS:60, ON_HOLD:60, REVIEW:85, COMPLETED:100, CANCELLED:0 }[activeProject.status] ?? 0;
                return (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>Progress</span>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--arc-gold)' }}>{pct}%</span>
                    </div>
                    <div className="h-[2px] rounded-full" style={{ background: 'var(--arc-dim)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--arc-gold), var(--arc-gold-lt))' }} />
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Budget',   value: activeProject.budget ? money(activeProject.budget) : '—' },
                  { label: 'Start',    value: shortDate(activeProject.start_date) },
                  { label: 'Delivery', value: shortDate(activeProject.end_date) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] tracking-widest uppercase mb-1"
                      style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>{label}</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-mono)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom grid: Tickets + Invoices ──────────────────────── */}
        <div className="grid grid-cols-2 gap-6">

          {/* Recent tickets */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-cream)', fontWeight: 600 }} className="text-base">
                Support
              </h2>
              <Link href="/client/tickets"
                className="text-[11px] flex items-center gap-1.5 hover:opacity-80"
                style={{ color: 'var(--arc-gold)' }}>
                VIEW ALL <ArrowRight size={11} />
              </Link>
            </div>
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--arc-bg-card)', border: '1px solid var(--arc-border)' }}>
              {tickets.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--arc-mute)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    No open tickets.
                  </p>
                </div>
              ) : tickets.slice(0, 4).map((t, i) => (
                <div key={t.id}
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: i < Math.min(3, tickets.length - 1) ? '1px solid var(--arc-border)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate" style={{ color: 'var(--arc-cream)' }}>{t.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-mono)' }}>{relTime(t.created_at)}</p>
                  </div>
                  <ArcBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent invoices */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-cream)', fontWeight: 600 }} className="text-base">
                Invoices
              </h2>
              <Link href="/client/invoices"
                className="text-[11px] flex items-center gap-1.5 hover:opacity-80"
                style={{ color: 'var(--arc-gold)' }}>
                VIEW ALL <ArrowRight size={11} />
              </Link>
            </div>
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--arc-bg-card)', border: '1px solid var(--arc-border)' }}>
              {invoices.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--arc-mute)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    No invoices yet.
                  </p>
                </div>
              ) : invoices.slice(0, 4).map((inv, i) => (
                <div key={inv.id}
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: i < Math.min(3, invoices.length - 1) ? '1px solid var(--arc-border)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate" style={{ color: 'var(--arc-cream)' }}>{inv.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-mono)' }}>
                      {inv.invoice_number} · Due {shortDate(inv.due_date)}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-mono)' }}>
                      {money(inv.total_amount, inv.currency)}
                    </p>
                    <ArcBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="arc-rule" />
        <p className="text-center text-[11px]" style={{ color: 'var(--arc-dim)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
          ARC IT Solutions — crafting software and design that endures.
        </p>
      </div>
    </div>
  );
}
