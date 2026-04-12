'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Inquiry, User, Paginated, ConvertInquiryPayload } from '@/types';
import { Badge, PriBadge, Btn, Input, Select, Textarea, SectionLabel, Modal, Alert } from '@/components/ui';
import { PageShell, ListHeader, EmptyDetail, DetailHeader, DetailBody, Section } from '@/components/modules/PageShell';
import { relTime, fullDate } from '@/lib/utils';
import { patchInquiryAction, deleteInquiryAction, convertInquiryAction } from '@/app/actions';
import { Phone, MessageSquare, UserPlus, Trash2, RefreshCw, Plus } from 'lucide-react';

const INQ_STATUSES = ['NEW','CONTACTED','QUALIFIED','CONVERTED','REJECTED'] as const;
const PRIORITIES   = ['LOW','MEDIUM','HIGH','URGENT'] as const;
const SOURCES      = ['website_form','cold_call','referral','social','other'] as const;

const SOURCE_BAR: Record<string, string> = {
  website_form: 'bg-[#f0883e]',
  cold_call:    'bg-[#388bfd]',
  referral:     'bg-[#3fb950]',
  social:       'bg-[#a371f7]',
  other:        'bg-[#484f58]',
};

export function InquiriesClient({
  inquiries,
  employees,
  currentUser,
}: {
  inquiries: Paginated<Inquiry>;
  employees: User[];
  currentUser: User;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConvert, setShowConvert] = useState(false);

  // Filters (local — page reload via router for server refetch)
  const [statusFilter, setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Convert modal state
  const [cv, setCv] = useState<ConvertInquiryPayload>({
    full_name: '', password: '', project_title: '', project_description: '', priority: 'HIGH',
  });

  const isAdmin    = currentUser.role === 'admin';
  const isEmployee = currentUser.role !== 'client';

  function notify(msg: string, type: 'ok' | 'err') {
    if (type === 'ok') { setSuccess(msg); setError(''); }
    else               { setError(msg);   setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }

  function applyFilters() {
    const p = new URLSearchParams();
    if (statusFilter)   p.set('status', statusFilter);
    if (priorityFilter) p.set('priority', priorityFilter);
    router.push(`/inquiries?${p.toString()}`);
  }

  async function handlePatch(field: string, value: string) {
    if (!selected) return;
    startTransition(async () => {
      const r = await patchInquiryAction(selected.id, { [field]: value });
      if (r.ok) notify('Updated.', 'ok');
      else notify(r.error, 'err');
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!selected || !confirm('Delete this inquiry? Cannot be undone.')) return;
    startTransition(async () => {
      const r = await deleteInquiryAction(selected.id);
      if (r.ok) { setSelected(null); notify('Deleted.', 'ok'); router.refresh(); }
      else notify(r.error, 'err');
    });
  }

  async function handleConvert() {
    if (!selected) return;
    if (!cv.full_name || !cv.password || !cv.project_title)
      return setError('Name, password, and project title are required.');
    startTransition(async () => {
      const r = await convertInquiryAction(selected.id, cv);
      if (r.ok) {
        const res = r.data as { client_id: string; project_id: string; client_created: boolean };
        notify(
          `Converted! ${res.client_created ? 'New client account created.' : 'Linked to existing account.'} Project ID: ${res.project_id}`,
          'ok'
        );
        setShowConvert(false);
        router.push('/projects');
      } else notify(r.error, 'err');
    });
  }

  const canConvert = selected?.status === 'QUALIFIED' && isEmployee;
  const canDelete  = isAdmin && selected?.status !== 'CONVERTED';

  return (
    <>
      <PageShell
        listSlot={
          <>
            <ListHeader
              title="Inquiries"
              count={inquiries.total}
              filters={
                <>
                  <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }} className="text-[11px] h-7 px-2">
                    <option value="">All Status</option>
                    {INQ_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); }} className="text-[11px] h-7 px-2">
                    <option value="">All Priority</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <Btn variant="ghost" className="h-7 px-2 text-[11px]" onClick={applyFilters}>
                    <RefreshCw size={11} />
                  </Btn>
                </>
              }
            />
            <div className="flex-1 overflow-y-auto">
              {inquiries.items.length === 0 && (
                <div className="flex items-center justify-center py-12 text-[#484f58] text-sm">No inquiries found</div>
              )}
              {inquiries.items.map(inq => (
                <button key={inq.id} onClick={() => setSelected(inq)}
                  className={`w-full text-left flex gap-0 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.id === inq.id ? 'bg-white/[0.05]' : ''}`}>
                  <div className={`w-[3px] flex-shrink-0 ${SOURCE_BAR[inq.source ?? 'other'] ?? 'bg-[#484f58]'}`} />
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-[13px] truncate ${!inq.notes ? 'font-medium text-[#e6edf3]' : 'text-[#8b949e]'}`}>{inq.name}</span>
                      <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">{relTime(inq.created_at)}</span>
                    </div>
                    <div className="text-[11px] text-[#484f58] truncate mt-0.5">{inq.subject ?? inq.company ?? inq.email}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <PriBadge priority={inq.priority} />
                      <Badge status={inq.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        }
        detailSlot={
          !selected ? <EmptyDetail text="Select an inquiry to view details" /> : (
            <>
              <DetailHeader
                title={selected.name}
                sub={`${selected.email}${selected.phone ? ' · ' + selected.phone : ''}${selected.company ? ' · ' + selected.company : ''}`}
                badges={<><PriBadge priority={selected.priority} /><Badge status={selected.status} /></>}
                actions={
                  <>
                    {canConvert && (
                      <Btn variant="success" onClick={() => { setCv({ ...cv, full_name: selected.name, project_title: `${selected.company ?? selected.name} — Project` }); setShowConvert(true); }}>
                        <UserPlus size={13} /> Convert to Client
                      </Btn>
                    )}
                    <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/14 bg-[#1c2128] text-[12px] font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors">
                      <Phone size={12} /> Call
                    </a>
                    <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/14 bg-[#1c2128] text-[12px] font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors">
                      <MessageSquare size={12} /> Email
                    </a>
                    {canDelete && <Btn variant="danger" onClick={handleDelete}><Trash2 size={12} /></Btn>}
                  </>
                }
              />
              <DetailBody>
                {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}

                {selected.subject && (
                  <Section label="Subject">
                    <p className="text-sm font-medium text-[#e6edf3]">{selected.subject}</p>
                  </Section>
                )}

                {selected.message && (
                  <Section label="Message">
                    <blockquote className="bg-[#161b22] border border-white/[0.08] border-l-[3px] border-l-white/14 rounded-lg px-4 py-3 text-sm text-[#8b949e] leading-relaxed whitespace-pre-wrap">
                      {selected.message}
                    </blockquote>
                  </Section>
                )}

                <Section label="Details">
                  <table className="w-full text-sm"><tbody>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-28">Source</td><td className="py-1.5 text-[12px] text-[#e6edf3] capitalize">{selected.source?.replace('_', ' ') ?? '—'}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Received</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{fullDate(selected.created_at)}</td></tr>
                    {selected.converted_at && <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Converted</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{fullDate(selected.converted_at)}</td></tr>}
                    {selected.converted_project_id && <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Project</td><td className="py-1.5 text-[12px] font-mono text-[#388bfd]">{selected.converted_project_id}</td></tr>}
                  </tbody></table>
                </Section>

                {isEmployee && selected.status !== 'CONVERTED' && selected.status !== 'REJECTED' && (
                  <Section label="Update Status">
                    <div className="flex flex-wrap gap-2">
                      {INQ_STATUSES.filter(s => s !== 'CONVERTED').map(s => (
                        <Btn key={s} variant={selected.status === s ? 'primary' : 'secondary'}
                          onClick={() => handlePatch('status', s)} disabled={isPending}>
                          {s}
                        </Btn>
                      ))}
                    </div>
                  </Section>
                )}

                {isEmployee && (
                  <Section label="Notes">
                    <Textarea
                      defaultValue={selected.notes ?? ''}
                      rows={3} className="w-full"
                      onBlur={e => { if (e.target.value !== (selected.notes ?? '')) handlePatch('notes', e.target.value); }}
                      placeholder="Add notes…"
                    />
                  </Section>
                )}

                {isEmployee && (
                  <Section label="Assign To">
                    <Select
                      defaultValue={selected.assigned_to ?? ''}
                      onChange={e => handlePatch('assigned_to', e.target.value)}
                      className="w-48"
                    >
                      <option value="">Unassigned</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </Select>
                  </Section>
                )}
              </DetailBody>
            </>
          )
        }
      />

      {/* Convert modal */}
      {showConvert && selected && (
        <Modal title={`Convert: ${selected.name}`} onClose={() => setShowConvert(false)}>
          <p className="text-xs text-[#8b949e] mb-4">
            This will create a client account and a linked project in PLANNING status.
            The client will be able to log in with the credentials you set below.
          </p>
          {error && <Alert type="error" message={error} />}
          <div className="space-y-3">
            <div><SectionLabel>Client Full Name *</SectionLabel>
              <Input className="w-full" value={cv.full_name} onChange={e => setCv({ ...cv, full_name: e.target.value })} />
            </div>
            <div><SectionLabel>Temporary Password *</SectionLabel>
              <Input className="w-full" type="password" placeholder="Min 8 chars" value={cv.password} onChange={e => setCv({ ...cv, password: e.target.value })} />
            </div>
            <div><SectionLabel>Project Title *</SectionLabel>
              <Input className="w-full" value={cv.project_title} onChange={e => setCv({ ...cv, project_title: e.target.value })} />
            </div>
            <div><SectionLabel>Project Description</SectionLabel>
              <Textarea className="w-full" rows={2} value={cv.project_description ?? ''} onChange={e => setCv({ ...cv, project_description: e.target.value })} />
            </div>
            <div><SectionLabel>Priority</SectionLabel>
              <Select value={cv.priority ?? 'HIGH'} onChange={e => setCv({ ...cv, priority: e.target.value as never })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Btn variant="success" onClick={handleConvert} loading={isPending} className="flex-1 justify-center">
              <UserPlus size={13} /> Create Client + Project
            </Btn>
            <Btn variant="ghost" onClick={() => setShowConvert(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
