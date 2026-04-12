'use client';

import { useState } from 'react';
import type { Invoice, Payment, User } from '@/types';
import {
  ArcBadge, ArcCard, ArcPageHeader, ArcEmpty, ArcInfoRow, ArcBtn, ArcAlert,
} from '@/components/arc-ui';
import { money, shortDate, fullDate } from '@/lib/utils';
import { getInvoiceDownloadAction } from '@/app/actions';
import { Download, FileText } from 'lucide-react';

type EnrichedInvoice = Invoice & { payments: Payment[] };

const STATUS_ORDER = ['OVERDUE','PARTIALLY_PAID','SENT','DRAFT','PAID','CANCELLED'];

export function ClientInvoicesClient({
  invoices,
  currentUser,
}: {
  invoices: EnrichedInvoice[];
  currentUser: User;
}) {
  const [selected, setSelected] = useState<EnrichedInvoice | null>(
    invoices.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))[0] ?? null
  );
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (!selected) return;
    setDownloading(true); setError('');
    const r = await getInvoiceDownloadAction(selected.id);
    setDownloading(false);
    if (r.ok) {
      const { signed_url } = r.data as { signed_url: string };
      window.open(signed_url, '_blank');
    } else setError(r.error);
  }

  const totalPaid = selected?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const paidPct   = selected ? Math.min(100, (totalPaid / selected.total_amount) * 100) : 0;
  const outstanding = selected ? selected.total_amount - totalPaid : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ArcPageHeader
        title="Invoices"
        italic="& Billing"
        sub="Your complete billing history with ARC IT Solutions."
      />

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto"
          style={{ borderRight: '1px solid var(--arc-border)' }}>

          {invoices.length === 0 && (
            <ArcEmpty message="No invoices yet." />
          )}

          {invoices
            .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
            .map((inv, i) => {
              const isSelected = selected?.id === inv.id;
              return (
                <button key={inv.id} onClick={() => setSelected(inv)}
                  className="w-full text-left px-5 py-4 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--arc-border)',
                    background:   isSelected ? 'rgba(201,168,76,0.05)' : 'transparent',
                    borderLeft:   isSelected ? '2px solid var(--arc-gold)' : '2px solid transparent',
                  }}>
                  {/* Invoice number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px]"
                      style={{ color: 'var(--arc-gold)', fontFamily: 'var(--font-mono)' }}>
                      {inv.invoice_number}
                    </span>
                    <ArcBadge status={inv.status} />
                  </div>
                  {/* Title */}
                  <p className="text-[13px] truncate mb-1" style={{ color: 'var(--arc-cream)' }}>{inv.title}</p>
                  {/* Amount + due */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold"
                      style={{ color: inv.status === 'OVERDUE' ? '#e86b6b' : 'var(--arc-cream)', fontFamily: 'var(--font-mono)' }}>
                      {money(inv.total_amount, inv.currency)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-mono)' }}>
                      Due {shortDate(inv.due_date)}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <ArcEmpty message="Select an invoice to view details." />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8">
            {error && <ArcAlert type="error" message={error} />}

            {/* Invoice header */}
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--arc-gold)', fontSize: '11px' }}>
                    {selected.invoice_number}
                  </span>
                  <ArcBadge status={selected.status} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-ivory)', fontWeight: 700, fontSize: '1.35rem' }}>
                  {selected.title}
                </h2>
                {selected.description && (
                  <p className="text-sm mt-1" style={{ color: 'var(--arc-mute)' }}>{selected.description}</p>
                )}
              </div>
              {selected.file_url || true ? (
                <ArcBtn variant="outline" onClick={handleDownload} loading={downloading} style={{ flexShrink: 0 }}>
                  <Download size={13} /> Download PDF
                </ArcBtn>
              ) : null}
            </div>

            {/* Payment progress — shown for unpaid/partial */}
            {['SENT','PARTIALLY_PAID','OVERDUE'].includes(selected.status) && (
              <ArcCard>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--arc-mute)' }}>Payment Progress</p>
                    <p style={{ fontFamily: 'var(--font-serif)', color: outstanding > 0 ? '#e86b6b' : '#5cb85c', fontSize: '1.5rem', fontWeight: 700, fontStyle: 'italic' }}>
                      {money(outstanding, selected.currency)} outstanding
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--arc-mute)' }}>Total Invoice</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-mono)' }}>
                      {money(selected.total_amount, selected.currency)}
                    </p>
                  </div>
                </div>
                {/* Gold progress bar */}
                <div className="h-[3px] rounded-full" style={{ background: 'var(--arc-dim)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${paidPct}%`,
                      background: 'linear-gradient(90deg, var(--arc-gold), var(--arc-gold-lt))',
                    }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-mono)' }}>
                    {money(totalPaid, selected.currency)} paid
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--arc-gold)', fontFamily: 'var(--font-mono)' }}>
                    {Math.round(paidPct)}%
                  </span>
                </div>
              </ArcCard>
            )}

            {/* Invoice details */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] tracking-[.14em] uppercase" style={{ color: 'var(--arc-mute)' }}>Invoice Details</span>
                <div className="h-px flex-1" style={{ background: 'var(--arc-border)' }} />
              </div>
              <table className="w-full"><tbody>
                <ArcInfoRow label="Amount">{money(selected.amount, selected.currency)}</ArcInfoRow>
                <ArcInfoRow label={`Tax (${selected.tax_rate}%)`}>{money(selected.tax_amount, selected.currency)}</ArcInfoRow>
                <ArcInfoRow label="Total">
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--arc-ivory)', fontSize: '1rem' }}>
                    {money(selected.total_amount, selected.currency)}
                  </span>
                </ArcInfoRow>
                <ArcInfoRow label="Due Date">{shortDate(selected.due_date)}</ArcInfoRow>
                <ArcInfoRow label="Issued">{fullDate(selected.created_at)}</ArcInfoRow>
                {selected.paid_at && <ArcInfoRow label="Paid On">{fullDate(selected.paid_at)}</ArcInfoRow>}
                {selected.notes && <ArcInfoRow label="Notes">{selected.notes}</ArcInfoRow>}
              </tbody></table>
            </div>

            {/* Payment history */}
            {selected.payments.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] tracking-[.14em] uppercase" style={{ color: 'var(--arc-mute)' }}>
                    Payment History ({selected.payments.length})
                  </span>
                  <div className="h-px flex-1" style={{ background: 'var(--arc-border)' }} />
                </div>
                <div className="space-y-2">
                  {selected.payments.map((pay, i) => (
                    <div key={pay.id} className="flex items-center justify-between px-5 py-3.5 rounded-xl"
                      style={{ background: 'var(--arc-bg-card)', border: '1px solid var(--arc-border)' }}>
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-mono)' }}>
                          {money(pay.amount, selected.currency)}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-mono)' }}>
                          {shortDate(pay.payment_date)}
                          {pay.payment_method ? ` · ${pay.payment_method.replace('_', ' ')}` : ''}
                          {pay.reference ? ` · ${pay.reference}` : ''}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{ background: '#5cb85c' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes for client if overdue */}
            {selected.status === 'OVERDUE' && (
              <div className="px-5 py-4 rounded-xl"
                style={{ background: 'rgba(232,107,107,.06)', border: '1px solid rgba(232,107,107,.2)' }}>
                <p className="text-sm" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: '#e86b6b' }}>
                  This invoice is past due. Please contact your project manager to arrange payment.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
