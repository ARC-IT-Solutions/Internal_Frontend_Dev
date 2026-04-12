'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Milestone, Project, User } from '@/types';
import { Badge, Btn, Select, Input, Textarea, Alert, SectionLabel, Modal } from '@/components/ui';
import { Section } from '@/components/modules/PageShell';
import { money, shortDate, relTime } from '@/lib/utils';
import {
  createMilestoneAction, updateMilestoneAction,
  activateMilestoneAction, deleteMilestoneAction,
} from '@/app/actions';
import { Zap, Plus, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'text-amber-400',
  INVOICED: 'text-blue-400',
  PAID:     'text-green-400',
};

const STATUS_BG: Record<string, string> = {
  PENDING:  'border-l-amber-500',
  INVOICED: 'border-l-blue-500',
  PAID:     'border-l-green-500',
};

export function MilestonesClient({
  projects,
  initialMilestones,
  initialProjectId,
  currentUser,
}: {
  projects: Project[];
  initialMilestones: Milestone[];
  initialProjectId: string | null;
  currentUser: User;
}) {
  const router = useRouter();
  const [projectId, setProjectId]         = useState(initialProjectId ?? '');
  const [milestones, setMilestones]       = useState<Milestone[]>(initialMilestones);
  const [loadingMs, setLoadingMs]         = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd]             = useState(false);

  // New milestone form
  const [form, setForm] = useState({
    title: '', description: '', percentage: '', amount: '',
    due_date: '', order_index: String(milestones.length + 1),
    usePercentage: true,
  });

  const selectedProject = projects.find(p => p.id === projectId);
  const isEmployee = currentUser.role !== 'client';

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 5000);
  }

  async function loadMilestones(pid: string) {
    if (!pid) { setMilestones([]); return; }
    setLoadingMs(true);
    try {
      const res = await fetch(`/api/proxy/milestones/${pid}`);
      const data = await res.json();
      setMilestones(data.milestones ?? []);
    } catch { setMilestones([]); }
    setLoadingMs(false);
  }

  async function handleActivate(ms: Milestone) {
    if (!projectId) return;
    if (!confirm(`Activate "${ms.title}"? This will auto-generate an invoice and email the client.`)) return;
    startTransition(async () => {
      const r = await activateMilestoneAction(projectId, ms.id);
      if (r.ok) {
        notify('Milestone activated — invoice auto-generated!', 'ok');
        loadMilestones(projectId);
      } else notify(r.error, 'err');
    });
  }

  async function handleDelete(ms: Milestone) {
    if (!projectId) return;
    if (!confirm('Delete this milestone?')) return;
    startTransition(async () => {
      const r = await deleteMilestoneAction(projectId, ms.id);
      if (r.ok) { notify('Deleted.', 'ok'); loadMilestones(projectId); }
      else notify(r.error, 'err');
    });
  }

  async function handleAdd() {
    if (!projectId) return;
    if (!form.title) return setError('Title is required.');
    if (form.usePercentage && !form.percentage) return setError('Percentage is required.');
    if (!form.usePercentage && !form.amount) return setError('Amount is required.');
    if (form.usePercentage && selectedProject && !selectedProject.budget)
      return setError('Project must have a budget set to use percentage milestones.');

    const payload: Record<string, unknown> = {
      title: form.title,
      order_index: parseInt(form.order_index) || milestones.length + 1,
    };
    if (form.description) payload.description = form.description;
    if (form.due_date)    payload.due_date = form.due_date;
    if (form.usePercentage) payload.percentage = parseFloat(form.percentage);
    else                    payload.amount = parseFloat(form.amount);

    startTransition(async () => {
      const r = await createMilestoneAction(projectId, payload);
      if (r.ok) {
        notify('Milestone added.', 'ok');
        setShowAdd(false);
        setForm({ title:'', description:'', percentage:'', amount:'', due_date:'', order_index: String(milestones.length + 2), usePercentage: true });
        loadMilestones(projectId);
      } else notify(r.error, 'err');
    });
  }

  // Summary
  const totalPct = milestones.filter(m => m.percentage).reduce((s, m) => s + (m.percentage ?? 0), 0);
  const allPaid  = milestones.length > 0 && milestones.every(m => m.status === 'PAID');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.08] flex items-center gap-4">
        <h1 className="text-sm font-semibold text-[#e6edf3]">Billing Milestones</h1>
        <Select
          value={projectId}
          onChange={e => { setProjectId(e.target.value); loadMilestones(e.target.value); }}
          className="w-72"
        >
          <option value="">Select a project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
        {isEmployee && projectId && (
          <Btn variant="ghost" className="ml-auto h-8 px-3 text-[12px]" onClick={() => setShowAdd(true)}>
            <Plus size={13} /> Add Milestone
          </Btn>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!projectId && (
          <div className="flex items-center justify-center py-24 text-[#484f58] text-sm">Select a project to manage its milestones</div>
        )}

        {projectId && !loadingMs && (
          <>
            {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}

            {/* Summary */}
            {selectedProject && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#161b22] rounded-xl border border-white/[0.08] p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[#484f58] mb-1">Project Budget</div>
                  <div className="text-lg font-semibold font-mono text-[#e6edf3]">{selectedProject.budget ? money(selectedProject.budget) : '—'}</div>
                </div>
                <div className="bg-[#161b22] rounded-xl border border-white/[0.08] p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[#484f58] mb-1">% Allocated</div>
                  <div className={`text-lg font-semibold font-mono ${totalPct > 100 ? 'text-red-400' : totalPct === 100 ? 'text-green-400' : 'text-[#e6edf3]'}`}>{totalPct}%</div>
                </div>
                <div className="bg-[#161b22] rounded-xl border border-white/[0.08] p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[#484f58] mb-1">Status</div>
                  <div className={`text-sm font-medium ${allPaid ? 'text-green-400' : 'text-[#8b949e]'}`}>{allPaid ? 'Fully Paid' : `${milestones.filter(m => m.status === 'PAID').length}/${milestones.length} paid`}</div>
                </div>
              </div>
            )}

            {milestones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-[#484f58]">
                <p className="text-sm">No milestones yet. Add your billing milestones to get started.</p>
              </div>
            )}

            {/* Milestone cards */}
            <div className="space-y-3">
              {milestones.sort((a, b) => a.order_index - b.order_index).map((ms, i) => (
                <div key={ms.id} className={`bg-[#161b22] rounded-xl border border-white/[0.08] border-l-4 ${STATUS_BG[ms.status] ?? ''} p-4`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono text-[#484f58]">#{ms.order_index}</span>
                        <h3 className="text-sm font-medium text-[#e6edf3]">{ms.title}</h3>
                        <Badge status={ms.status} />
                      </div>
                      {ms.description && <p className="text-[12px] text-[#8b949e] mb-2">{ms.description}</p>}
                      <div className="flex items-center gap-4 text-[11px] text-[#484f58]">
                        {ms.percentage && <span className="font-mono font-medium text-[#e6edf3]">{ms.percentage}% of budget</span>}
                        {ms.amount && <span className="font-mono font-medium text-[#e6edf3]">{money(ms.amount)}</span>}
                        {ms.due_date && <span>Due: {shortDate(ms.due_date)}</span>}
                        {ms.invoice_id && (
                          <Link href={`/invoices?invoice=${ms.invoice_id}`} className="flex items-center gap-1 text-blue-400 hover:underline">
                            <ExternalLink size={10} /> Invoice
                          </Link>
                        )}
                      </div>
                    </div>
                    {isEmployee && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ms.status === 'PENDING' && (
                          <>
                            <Btn variant="success" onClick={() => handleActivate(ms)} disabled={isPending} className="text-[11px] h-7 px-2.5">
                              <Zap size={12} /> Activate
                            </Btn>
                            <Btn variant="danger" onClick={() => handleDelete(ms)} disabled={isPending} className="h-7 px-2">
                              <Trash2 size={11} />
                            </Btn>
                          </>
                        )}
                        {ms.status === 'INVOICED' && (
                          <span className="text-[11px] text-blue-400 italic">Invoice sent — awaiting payment</span>
                        )}
                        {ms.status === 'PAID' && (
                          <span className="text-[11px] text-green-400 italic">Fully paid</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add milestone modal */}
      {showAdd && (
        <Modal title="Add Billing Milestone" onClose={() => setShowAdd(false)}>
          {error && <Alert type="error" message={error} />}
          {selectedProject?.budget && (
            <p className="text-[11px] text-[#8b949e] mb-4 bg-[#1c2128] rounded-lg px-3 py-2">
              Project budget: <span className="font-mono text-[#e6edf3]">{money(selectedProject.budget)}</span>
            </p>
          )}
          <div className="space-y-3">
            <div><SectionLabel>Title *</SectionLabel><Input className="w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><SectionLabel>Description</SectionLabel><Textarea className="w-full" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

            <div>
              <SectionLabel>Billing Amount *</SectionLabel>
              <div className="flex gap-2 mb-2">
                <Btn variant={form.usePercentage ? 'primary' : 'secondary'} className="text-[11px]" onClick={() => setForm({ ...form, usePercentage: true })}>% of Budget</Btn>
                <Btn variant={!form.usePercentage ? 'primary' : 'secondary'} className="text-[11px]" onClick={() => setForm({ ...form, usePercentage: false })}>Fixed Amount</Btn>
              </div>
              {form.usePercentage
                ? <div className="flex items-center gap-2"><Input type="number" min="1" max="100" className="w-24" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} placeholder="30" /><span className="text-[#484f58] text-sm">%</span></div>
                : <div className="flex items-center gap-2"><Input type="number" className="w-40" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="240000" /></div>
              }
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><SectionLabel>Due Date</SectionLabel><Input className="w-full" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><SectionLabel>Order Index</SectionLabel><Input className="w-full" type="number" min="1" value={form.order_index} onChange={e => setForm({ ...form, order_index: e.target.value })} /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Btn variant="primary" onClick={handleAdd} loading={isPending} className="flex-1 justify-center">Add Milestone</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
