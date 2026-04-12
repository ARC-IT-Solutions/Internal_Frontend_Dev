'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Invoice, Payment, User, Paginated, RecordPaymentPayload } from '@/types';
import { Badge, Btn, Select, Input, Textarea, Alert, SectionLabel, Modal } from '@/components/ui';
import { PageShell, ListHeader, EmptyDetail, DetailHeader, DetailBody, Section } from '@/components/modules/PageShell';
import { money, fullDate, shortDate, relTime } from '@/lib/utils';
import {
  patchInvoiceAction, deleteInvoiceAction, getInvoiceDownloadAction,
  recordPaymentAction, deletePaymentAction,
} from '@/app/actions';
import { Download, Plus, Trash2, CreditCard, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const INV_STATUSES = ['DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'] as const;
const PAY_METHODS  = ['bank_transfer','card','upi','cash','other'] as const;

const STATUS_BAR: Record<string, string> = {
  DRAFT:          'bg-[#484f58]',
  SENT:           'bg-[#388bfd]',
  PARTIALLY_PAID: 'bg-[#f0883e]',
  PAID:           'bg-[#3fb950]',
  OVERDUE:        'bg-[#f85149]',
  CANCELLED:      'bg-[#484f58]',
};

export function InvoicesClient({
  invoices,
  currentUser,
  initialFocusId,
  initialPayments,
}: {
  invoices: Paginated<Invoice>;
  currentUser: User;
  initialFocusId: string | null;
  initialPayments: Payment[];
}) {
  const router = useRouter();
  const [selected, setSelected]       = useState<Invoice | null>(
    initialFocusId ? (invoices.items.find(i => i.id === initialFocusId) ?? null) : null
  );
  const [payments, setPayments]       = useState<Payment[]>(initialPayments);
  const [loadingPay, setLoadingPay]   = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showRecordPay, setShowRecordPay] = useState(false);

  // Payment form
  const [pf, setPf] = useState<Partial<RecordPaymentPayload>>({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
  });

  const isEmployee = currentUser.role !== 'client';
  const isAdmin    = currentUser.role === 'admin';

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 5000);
  }

  async function selectInvoice(inv: Invoice) {
    setSelected(inv);
    setLoadingPay(true);
    try {
      const res = await fetch(`/api/proxy/payments/invoice/${inv.id}`);
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch { setPayments([]); }
    setLoadingPay(false);
  }

  async function handleRecordPayment() {
    if (!selected || !pf.amount || !pf.payment_date)
      return setError('Amount and payment date are required.');
    startTransition(async () => {
      const r = await recordPaymentAction({
        invoice_id: selected.id,
        amount: pf.amount!,
        payment_date: pf.payment_date!,
        payment_method: pf.payment_method,
        reference: pf.reference,
        notes: pf.notes,
      });
      if (r.ok) {
        notify('Payment recorded. Invoice status auto-updated.', 'ok');
        setShowRecordPay(false);
        setPf({ payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank_transfer' });
        // Reload invoice and payments
        router.refresh();
        selectInvoice(selected);
      } else notify(r.error, 'err');
    });
  }

  async function handleDeletePayment(pay: Payment) {
    if (!confirm('Delete this payment? Invoice status will recalculate.')) return;
    startTransition(async () => {
      const r = await deletePaymentAction(pay.id);
      if (r.ok) { notify('Payment deleted. Status recalculated.', 'ok'); if (selected) selectInvoice(selected); }
      else notify(r.error, 'err');
    });
  }

  async function handleDownload() {
    if (!selected) return;
    const r = await getInvoiceDownloadAction(selected.id);
    if (r.ok) {
      const { signed_url } = r.data as { signed_url: string };
      window.open(signed_url, '_blank');
    } else notify(r.error, 'err');
  }

  async function handleDelete() {
    if (!selected || !confirm('Delete this invoice?')) return;
    startTransition(async () => {
      const r = await deleteInvoiceAction(selected.id);
      if (r.ok) { setSelected(null); notify('Deleted.', 'ok'); router.refresh(); }
      else notify(r.error, 'err');
    });
  }

  // Payment progress
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const paidPct   = selected ? Math.min(100, Math.round((totalPaid / selected.total_amount) * 100)) : 0;

  return (
    <>
      <PageShell
        listSlot={
          <>
            <ListHeader title="Invoices" count={invoices.total} />
            <div className="flex-1 overflow-y-auto">
              {invoices.items.length === 0 && (
                <div className="flex items-center justify-center py-12 text-[#484f58] text-sm">No invoices</div>
              )}
              {invoices.items.map(inv => (
                <button key={inv.id} onClick={() => selectInvoice(inv)}
                  className={`w-full text-left flex border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.id === inv.id ? 'bg-white/[0.05]' : ''}`}>
                  <div className={`w-[3px] flex-shrink-0 ${STATUS_BAR[inv.status] ?? 'bg-[#484f58]'}`} />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-mono text-[#484f58]">{inv.invoice_number}</span>
                      <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">{relTime(inv.created_at)}</span>
                    </div>
                    <div className="text-[13px] font-medium text-[#e6edf3] truncate mt-0.5">{inv.title}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <Badge status={inv.status} />
                      <span className="text-[12px] font-mono font-semibold text-[#e6edf3]">{money(inv.total_amount, inv.currency)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        }
        detailSlot={
          !selected ? <EmptyDetail text="Select an invoice" /> : (
            <>
              <DetailHeader
                title={selected.title}
                sub={`${selected.invoice_number} · Project: ${selected.project_id}`}
                badges={<><Badge status={selected.status} /></>}
                actions={
                  <>
                    {selected.file_url && (
                      <Btn variant="ghost" onClick={handleDownload} className="text-[12px]">
                        <Download size={12} /> Download PDF
                      </Btn>
                    )}
                    {isEmployee && !['PAID','CANCELLED'].includes(selected.status) && (
                      <Btn variant="success" onClick={() => setShowRecordPay(true)}>
                        <CreditCard size={13} /> Record Payment
                      </Btn>
                    )}
                    {isAdmin && (
                      <Btn variant="danger" onClick={handleDelete} disabled={isPending}>
                        <Trash2 size={12} />
                      </Btn>
                    )}
                  </>
                }
              />
              <DetailBody>
                {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}

                {/* Payment progress bar */}
                {['SENT','PARTIALLY_PAID','OVERDUE'].includes(selected.status) && (
                  <Section label="Payment Progress">
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-[#8b949e]">Paid: <span className="text-[#e6edf3] font-mono">{money(totalPaid, selected.currency)}</span></span>
                      <span className="text-[#8b949e]">Total: <span className="text-[#e6edf3] font-mono">{money(selected.total_amount, selected.currency)}</span></span>
                    </div>
                    <div className="h-2 bg-[#1c2128] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3fb950] rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                    </div>
                    <p className="text-[11px] text-[#484f58] mt-1.5">{paidPct}% paid</p>
                  </Section>
                )}

                <Section label="Invoice Details">
                  <table className="w-full"><tbody>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-28">Amount</td><td className="py-1.5 text-[12px] font-mono text-[#e6edf3]">{money(selected.amount, selected.currency)}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Tax ({selected.tax_rate}%)</td><td className="py-1.5 text-[12px] font-mono text-[#e6edf3]">{money(selected.tax_amount, selected.currency)}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] font-semibold">Total</td><td className="py-1.5 text-[13px] font-mono font-semibold text-[#e6edf3]">{money(selected.total_amount, selected.currency)}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Due Date</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{shortDate(selected.due_date)}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Client</td><td className="py-1.5 text-[12px] font-mono text-[#e6edf3]">{selected.client_id}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Created</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{fullDate(selected.created_at)}</td></tr>
                  </tbody></table>
                </Section>

                {selected.notes && (
                  <Section label="Notes">
                    <p className="text-sm text-[#8b949e]">{selected.notes}</p>
                  </Section>
                )}

                {/* Payment history */}
                <Section label={`Payment History (${payments.length})`}>
                  {loadingPay && <p className="text-sm text-[#484f58]">Loading…</p>}
                  {!loadingPay && payments.length === 0 && (
                    <p className="text-sm text-[#484f58] italic">No payments recorded yet.</p>
                  )}
                  <div className="space-y-2">
                    {payments.map(pay => (
                      <div key={pay.id} className="flex items-center justify-between bg-[#161b22] rounded-lg border border-white/[0.08] px-4 py-3">
                        <div>
                          <div className="text-[13px] font-mono font-medium text-[#e6edf3]">{money(pay.amount, selected.currency)}</div>
                          <div className="text-[11px] text-[#484f58] mt-0.5">
                            {shortDate(pay.payment_date)} · {pay.payment_method?.replace('_', ' ')}
                            {pay.reference ? ` · ${pay.reference}` : ''}
                          </div>
                        </div>
                        {isEmployee && (
                          <Btn variant="danger" className="h-7 px-2" onClick={() => handleDeletePayment(pay)} disabled={isPending}>
                            <Trash2 size={11} />
                          </Btn>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              </DetailBody>
            </>
          )
        }
      />

      {/* Record payment modal */}
      {showRecordPay && selected && (
        <Modal title={`Record Payment — ${selected.invoice_number}`} onClose={() => setShowRecordPay(false)}>
          <p className="text-[11px] text-[#8b949e] mb-4 bg-[#1c2128] rounded-lg px-3 py-2">
            Outstanding: <span className="font-mono text-[#e6edf3]">{money(selected.total_amount - totalPaid, selected.currency)}</span>
            {' '}· Invoice status updates automatically based on total payments.
          </p>
          {error && <Alert type="error" message={error} />}
          <div className="space-y-3">
            <div><SectionLabel>Amount *</SectionLabel>
              <Input className="w-full" type="number" step="0.01"
                value={pf.amount ?? ''} onChange={e => setPf({ ...pf, amount: parseFloat(e.target.value) })}
                placeholder={String(selected.total_amount - totalPaid)} />
            </div>
            <div><SectionLabel>Payment Date *</SectionLabel>
              <Input className="w-full" type="date" value={pf.payment_date ?? ''} onChange={e => setPf({ ...pf, payment_date: e.target.value })} />
            </div>
            <div><SectionLabel>Payment Method</SectionLabel>
              <Select className="w-full" value={pf.payment_method ?? 'bank_transfer'} onChange={e => setPf({ ...pf, payment_method: e.target.value as never })}>
                {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </Select>
            </div>
            <div><SectionLabel>Reference / Transaction ID</SectionLabel>
              <Input className="w-full" placeholder="TXN-HDFC-001" value={pf.reference ?? ''} onChange={e => setPf({ ...pf, reference: e.target.value })} />
            </div>
            <div><SectionLabel>Notes</SectionLabel>
              <Textarea className="w-full" rows={2} value={pf.notes ?? ''} onChange={e => setPf({ ...pf, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Btn variant="success" onClick={handleRecordPayment} loading={isPending} className="flex-1 justify-center">
              <CreditCard size={13} /> Record Payment
            </Btn>
            <Btn variant="ghost" onClick={() => setShowRecordPay(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
