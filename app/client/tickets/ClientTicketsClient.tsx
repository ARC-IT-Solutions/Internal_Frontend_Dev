'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Ticket, TicketComment, Project, User } from '@/types';
import { Badge, PriBadge, Btn, Select, Input, Textarea, Alert, SectionLabel, Modal } from '@/components/ui';
import { relTime } from '@/lib/utils';
import { createTicketAction, addCommentAction } from '@/app/actions';
import { ArcPageHeader, ArcModal as ArcModalWrapper, ArcLabel, ArcSelect, ArcInput, ArcTextarea, ArcBtn as ArcBtnComp, ArcAlert as ArcAlertComp } from '@/components/arc-ui';
import { Plus, Send, Globe, Ticket as TicketIcon } from 'lucide-react';

const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;

const STATUS_BAR: Record<string, string> = {
  OPEN:           'bg-[#f85149]', IN_PROGRESS: 'bg-[#f0883e]',
  WAITING_CLIENT: 'bg-[#a371f7]', RESOLVED:    'bg-[#3fb950]', CLOSED: 'bg-[#484f58]',
};

export function ClientTicketsClient({
  tickets, projects, currentUser,
}: {
  tickets: Ticket[];
  projects: Project[];
  currentUser: User;
}) {
  const router = useRouter();
  const [selected, setSelected]      = useState<Ticket | null>(null);
  const [comments, setComments]      = useState<TicketComment[]>([]);
  const [loadingC, setLoadingC]      = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [newMsg, setNewMsg]          = useState('');
  const [showCreate, setShowCreate]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [cf, setCf] = useState({ title: '', description: '', priority: 'MEDIUM', project_id: projects[0]?.id ?? '' });

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }

  async function loadComments(ticketId: string) {
    setLoadingC(true);
    try {
      const res = await fetch(`/api/proxy?path=tickets/${ticketId}/comments`);
      const data = await res.json();
      // Client only sees non-internal comments (backend enforces, but filter here too)
      setComments((Array.isArray(data) ? data : []).filter((c: TicketComment) => !c.is_internal));
    } catch { setComments([]); }
    setLoadingC(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function selectTicket(t: Ticket) {
    setSelected(t);
    await loadComments(t.id);
  }

  async function handleCreateTicket() {
    if (!cf.title || !cf.project_id) return setError('Title and project are required.');
    startTransition(async () => {
      const r = await createTicketAction({ title: cf.title, description: cf.description || undefined, priority: cf.priority, project_id: cf.project_id });
      if (r.ok) { notify('Ticket raised!', 'ok'); setShowCreate(false); router.refresh(); }
      else notify(r.error, 'err');
    });
  }

  async function handleSendComment() {
    if (!selected || !newMsg.trim()) return;
    startTransition(async () => {
      // Clients always send non-internal comments (is_internal=false)
      const r = await addCommentAction(selected.id, newMsg.trim(), false);
      if (r.ok) {
        setComments(prev => [...prev, r.data as TicketComment]);
        setNewMsg('');
      } else notify(r.error, 'err');
    });
  }

  const openTickets   = tickets.filter(t => !['RESOLVED','CLOSED'].includes(t.status));
  const closedTickets = tickets.filter(t => ['RESOLVED','CLOSED'].includes(t.status));

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Ticket list */}
        <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden" style={{ background: "var(--arc-bg-raised)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-[#484f58]">
              Support Tickets ({tickets.length})
            </span>
            <Btn variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setShowCreate(true)}>
              <Plus size={12} /> New
            </Btn>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-[#484f58] text-sm gap-2">
                <TicketIcon size={24} className="opacity-40" />
                <p>No tickets yet</p>
              </div>
            )}
            {/* Open tickets */}
            {openTickets.map(t => (
              <button key={t.id} onClick={() => selectTicket(t)}
                className={`w-full text-left flex border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.id === t.id ? 'bg-white/[0.05]' : ''}`}>
                <div className={`w-[3px] flex-shrink-0 ${STATUS_BAR[t.status]}`} />
                <div className="flex-1 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#e6edf3] truncate">{t.title}</span>
                    <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">{relTime(t.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <PriBadge priority={t.priority} />
                    <Badge status={t.status} />
                  </div>
                </div>
              </button>
            ))}
            {/* Closed */}
            {closedTickets.length > 0 && (
              <>
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[#484f58] bg-[#0d1117]">Resolved</div>
                {closedTickets.map(t => (
                  <button key={t.id} onClick={() => selectTicket(t)}
                    className={`w-full text-left flex border-b border-white/[0.04] hover:bg-white/[0.03] opacity-60 transition-colors ${selected?.id === t.id ? 'bg-white/[0.05]' : ''}`}>
                    <div className={`w-[3px] flex-shrink-0 ${STATUS_BAR[t.status]}`} />
                    <div className="flex-1 px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-[#8b949e] truncate">{t.title}</span>
                        <span className="text-[10px] font-mono text-[#484f58]">{relTime(t.created_at)}</span>
                      </div>
                      <Badge status={t.status} className="mt-1" />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Conversation */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-[#484f58]">
            <div className="text-center">
              <TicketIcon size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a ticket to view the conversation</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#e6edf3]">{selected.title}</h2>
                  {selected.project_id && <p className="text-xs text-[#484f58] mt-0.5">Project: {selected.project_id.slice(0, 12)}…</p>}
                </div>
                <div className="flex items-center gap-2">
                  <PriBadge priority={selected.priority} />
                  <Badge status={selected.status} />
                </div>
              </div>
              {selected.description && (
                <p className="text-xs text-[#8b949e] mt-2 bg-[#111620] px-3 py-2 rounded-lg">{selected.description}</p>
              )}
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}
              {loadingC && <p className="text-sm text-[#484f58]">Loading conversation…</p>}
              {!loadingC && comments.length === 0 && (
                <p className="text-sm text-[#484f58] italic">No messages yet. Your project manager will reply shortly.</p>
              )}
              {comments.map(c => {
                const isMe = c.author_id === currentUser.id;
                return (
                  <div key={c.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isMe
                        ? 'bg-[#f0883e]/15 border border-[#f0883e]/25'
                        : 'bg-[#111620] border border-white/[0.08]'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe size={10} className="text-[#484f58]" />
                        <span className="text-[10px] text-[#484f58]">{isMe ? 'You' : 'Support Team'}</span>
                        <span className="text-[10px] font-mono text-[#484f58] ml-auto">{relTime(c.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-[#e6edf3] leading-relaxed whitespace-pre-wrap">{c.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Compose — only for active tickets */}
            {!['RESOLVED','CLOSED'].includes(selected.status) && (
              <div className="flex-shrink-0 border-t border-white/[0.06] px-6 py-4 bg-[#0a0e14]">
                <div className="flex gap-2">
                  <Textarea
                    className="flex-1"
                    rows={2}
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Send a message to our support team…"
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSendComment(); }}
                  />
                  <Btn variant="primary" onClick={handleSendComment} loading={isPending} className="self-end h-9 px-3">
                    <Send size={13} />
                  </Btn>
                </div>
                <p className="text-[10px] text-[#484f58] mt-1">Ctrl+Enter to send</p>
              </div>
            )}
            {['RESOLVED','CLOSED'].includes(selected.status) && (
              <div className="flex-shrink-0 px-6 py-3 border-t border-white/[0.06] text-center text-xs text-[#484f58] italic">
                This ticket is {selected.status.toLowerCase()}. Raise a new ticket if you need further help.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create ticket modal */}
      {showCreate && (
        <Modal title="Raise a Support Ticket" onClose={() => setShowCreate(false)}>
          <p className="text-[11px] text-[#8b949e] mb-4">Describe your issue clearly. Our team typically responds within a few hours.</p>
          {error && <Alert type="error" message={error} />}
          <div className="space-y-3">
            <div><SectionLabel>Title *</SectionLabel>
              <Input className="w-full" value={cf.title} onChange={e => setCf({ ...cf, title: e.target.value })} placeholder="Short summary of the issue" />
            </div>
            <div><SectionLabel>Description</SectionLabel>
              <Textarea className="w-full" rows={3} value={cf.description} onChange={e => setCf({ ...cf, description: e.target.value })} placeholder="Steps to reproduce, screenshots, expected vs actual behavior…" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><SectionLabel>Priority</SectionLabel>
                <Select value={cf.priority} onChange={e => setCf({ ...cf, priority: e.target.value })} className="w-full">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
              <div><SectionLabel>Project *</SectionLabel>
                <Select value={cf.project_id} onChange={e => setCf({ ...cf, project_id: e.target.value })} className="w-full">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Btn variant="primary" onClick={handleCreateTicket} loading={isPending} className="flex-1 justify-center">Raise Ticket</Btn>
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
