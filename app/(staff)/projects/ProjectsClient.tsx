'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, User, Paginated, ProjectStatus } from '@/types';
import { PROJECT_TRANSITIONS } from '@/types';
import { Badge, PriBadge, Btn, Select, Textarea, Modal, Alert, SectionLabel, Input } from '@/components/ui';
import { PageShell, ListHeader, EmptyDetail, DetailHeader, DetailBody, Section } from '@/components/modules/PageShell';
import { relTime, fullDate, money } from '@/lib/utils';
import { patchProjectAction, deleteProjectAction, createProjectAction } from '@/app/actions';
import { FolderKanban, Trash2, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const PRJ_STATUSES: ProjectStatus[] = ['DRAFT','PLANNING','ONBOARDING','IN_PROGRESS','ON_HOLD','REVIEW','COMPLETED','CANCELLED'];
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;

const STATUS_BAR: Record<string, string> = {
  DRAFT:       'bg-[#484f58]',
  PLANNING:    'bg-[#388bfd]',
  ONBOARDING:  'bg-[#a371f7]',
  IN_PROGRESS: 'bg-[#f0883e]',
  ON_HOLD:     'bg-[#a371f7]',
  REVIEW:      'bg-[#26d9b7]',
  COMPLETED:   'bg-[#3fb950]',
  CANCELLED:   'bg-[#f85149]',
};

export function ProjectsClient({
  projects,
  employees,
  currentUser,
}: {
  projects: Paginated<Project>;
  employees: User[];
  currentUser: User;
}) {
  const router = useRouter();
  const [selected, setSelected]   = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [cf, setCf] = useState({ title: '', description: '', client_id: '', priority: 'HIGH', budget: '', start_date: '', end_date: '' });

  const isAdmin    = currentUser.role === 'admin';
  const isEmployee = currentUser.role !== 'client';

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!selected) return;
    startTransition(async () => {
      const r = await patchProjectAction(selected.id, { status: newStatus });
      if (r.ok) {
        setSelected(r.data as Project);
        notify(`Status → ${newStatus}`, 'ok');
        router.refresh();
      } else notify(r.error, 'err');
    });
  }

  async function handleDelete() {
    if (!selected || !confirm('Delete this project?')) return;
    startTransition(async () => {
      const r = await deleteProjectAction(selected.id);
      if (r.ok) { setSelected(null); notify('Deleted.', 'ok'); router.refresh(); }
      else notify(r.error, 'err');
    });
  }

  async function handleCreate() {
    if (!cf.title || !cf.client_id) return setError('Title and Client ID are required.');
    startTransition(async () => {
      const payload: Record<string, unknown> = { title: cf.title, client_id: cf.client_id, priority: cf.priority };
      if (cf.description) payload.description = cf.description;
      if (cf.budget)      payload.budget = parseFloat(cf.budget);
      if (cf.start_date)  payload.start_date = cf.start_date;
      if (cf.end_date)    payload.end_date = cf.end_date;
      const r = await createProjectAction(payload);
      if (r.ok) { setShowCreate(false); notify('Project created.', 'ok'); router.refresh(); }
      else notify(r.error, 'err');
    });
  }

  // Allowed next states from current
  const allowedNext = selected ? PROJECT_TRANSITIONS[selected.status] ?? [] : [];

  const ONBOARDING_NOTE = selected?.status === 'ONBOARDING'
    ? 'Transition to IN_PROGRESS requires approved onboarding — enforced by backend.'
    : null;

  return (
    <>
      <PageShell
        listSlot={
          <>
            <ListHeader
              title="Projects"
              count={projects.total}
              actions={
                isEmployee && (
                  <Btn variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setShowCreate(true)}>
                    <Plus size={12} /> New
                  </Btn>
                )
              }
            />
            <div className="flex-1 overflow-y-auto">
              {projects.items.length === 0 && (
                <div className="flex items-center justify-center py-12 text-[#484f58] text-sm">No projects</div>
              )}
              {projects.items.map(p => (
                <button key={p.id} onClick={() => setSelected(p)}
                  className={`w-full text-left flex border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.id === p.id ? 'bg-white/[0.05]' : ''}`}>
                  <div className={`w-[3px] flex-shrink-0 ${STATUS_BAR[p.status] ?? 'bg-[#484f58]'}`} />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-[#e6edf3] truncate">{p.title}</span>
                      <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">{relTime(p.created_at)}</span>
                    </div>
                    {p.budget && <div className="text-[11px] text-[#484f58] mt-0.5">{money(p.budget)}</div>}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <PriBadge priority={p.priority} />
                      <Badge status={p.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        }
        detailSlot={
          !selected ? <EmptyDetail text="Select a project" /> : (
            <>
              <DetailHeader
                title={selected.title}
                sub={`Client: ${selected.client_id}`}
                badges={<><PriBadge priority={selected.priority} /><Badge status={selected.status} /></>}
                actions={
                  <>
                    <Link href={`/milestones?project=${selected.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/14 bg-[#1c2128] text-[12px] font-medium text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                      <ExternalLink size={12} /> Milestones
                    </Link>
                    <Link href={`/onboarding?project=${selected.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/14 bg-[#1c2128] text-[12px] font-medium text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                      Onboarding
                    </Link>
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

                {selected.description && (
                  <Section label="Description">
                    <p className="text-sm text-[#8b949e] leading-relaxed">{selected.description}</p>
                  </Section>
                )}

                <Section label="Details">
                  <table className="w-full"><tbody>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-28">Client ID</td><td className="py-1.5 text-[12px] font-mono text-[#e6edf3]">{selected.client_id}</td></tr>
                    {selected.budget && <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Budget</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{money(selected.budget)}</td></tr>}
                    {selected.start_date && <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Start</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{selected.start_date}</td></tr>}
                    {selected.end_date && <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">End</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{selected.end_date}</td></tr>}
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Created</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{fullDate(selected.created_at)}</td></tr>
                  </tbody></table>
                </Section>

                {/* Status transition enforcer — only shows allowed next states */}
                {isEmployee && allowedNext.length > 0 && (
                  <Section label="Move to Next Stage">
                    {ONBOARDING_NOTE && (
                      <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                        ⚠ {ONBOARDING_NOTE}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {allowedNext.map(next => (
                        <Btn key={next} variant={next === 'CANCELLED' ? 'danger' : 'secondary'}
                          onClick={() => handleStatusChange(next)} disabled={isPending}>
                          <ArrowRight size={12} /> {next.replace('_', ' ')}
                        </Btn>
                      ))}
                    </div>
                  </Section>
                )}

                {['COMPLETED','CANCELLED'].includes(selected.status) && (
                  <p className="text-[11px] text-[#484f58] italic">This project is in a terminal state and cannot be changed.</p>
                )}
              </DetailBody>
            </>
          )
        }
      />

      {/* Create project modal */}
      {showCreate && (
        <Modal title="Create New Project" onClose={() => setShowCreate(false)}>
          {error && <Alert type="error" message={error} />}
          <div className="space-y-3">
            <div><SectionLabel>Title *</SectionLabel><Input className="w-full" value={cf.title} onChange={e => setCf({ ...cf, title: e.target.value })} /></div>
            <div><SectionLabel>Client ID *</SectionLabel><Input className="w-full" placeholder="Client UUID" value={cf.client_id} onChange={e => setCf({ ...cf, client_id: e.target.value })} /></div>
            <div><SectionLabel>Description</SectionLabel><Textarea className="w-full" rows={2} value={cf.description} onChange={e => setCf({ ...cf, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><SectionLabel>Priority</SectionLabel>
                <Select value={cf.priority} onChange={e => setCf({ ...cf, priority: e.target.value })} className="w-full">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
              <div><SectionLabel>Budget</SectionLabel><Input className="w-full" type="number" placeholder="0" value={cf.budget} onChange={e => setCf({ ...cf, budget: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><SectionLabel>Start Date</SectionLabel><Input className="w-full" type="date" value={cf.start_date} onChange={e => setCf({ ...cf, start_date: e.target.value })} /></div>
              <div><SectionLabel>End Date</SectionLabel><Input className="w-full" type="date" value={cf.end_date} onChange={e => setCf({ ...cf, end_date: e.target.value })} /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Btn variant="primary" onClick={handleCreate} loading={isPending} className="flex-1 justify-center">Create Project</Btn>
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
