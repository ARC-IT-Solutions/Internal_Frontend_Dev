'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Ticket, TicketComment, User, Paginated } from '@/types';
import { Badge, PriBadge, Btn, Select, Textarea, Alert, SectionLabel } from '@/components/ui';
import { PageShell, ListHeader, EmptyDetail, DetailHeader, DetailBody, Section } from '@/components/modules/PageShell';
import { relTime, fullDate } from '@/lib/utils';
import { patchTicketAction, addCommentAction, deleteTicketAction } from '@/app/actions';
import { Lock, Globe, Trash2, Send } from 'lucide-react';

const TKT_STATUSES = ['OPEN','IN_PROGRESS','WAITING_CLIENT','RESOLVED','CLOSED'] as const;
const PRIORITIES   = ['LOW','MEDIUM','HIGH','URGENT'] as const;

const STATUS_BAR: Record<string, string> = {
  OPEN:           'bg-[#f85149]',
  IN_PROGRESS:    'bg-[#f0883e]',
  WAITING_CLIENT: 'bg-[#a371f7]',
  RESOLVED:       'bg-[#3fb950]',
  CLOSED:         'bg-[#484f58]',
};

export function TicketsClient({
  tickets,
  currentUser,
}: {
  tickets: Paginated<Ticket>;
  currentUser: User;
}) {
  const router = useRouter();
  const [selected, setSelected]         = useState<Ticket | null>(null);
  const [comments, setComments]         = useState<TicketComment[]>([]);
  const [loadingComments, setLoadingC]  = useState(false);
  const [isPending, startTransition]    = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [newComment, setNewComment]     = useState('');
  const [isInternal, setIsInternal]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isEmployee = currentUser.role !== 'client';
  const isAdmin    = currentUser.role === 'admin';

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }

  async function selectTicket(tkt: Ticket) {
    setSelected(tkt);
    setLoadingC(true);
    try {
      const res = await fetch(`/api/proxy/ticket-comments/${tkt.id}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch { setComments([]); }
    setLoadingC(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function handleStatusChange(status: string) {
    if (!selected) return;
    startTransition(async () => {
      const r = await patchTicketAction(selected.id, { status });
      if (r.ok) {
        setSelected(r.data as Ticket);
        notify('Status updated.', 'ok');
        router.refresh();
      } else notify(r.error, 'err');
    });
  }

  async function handleAddComment() {
    if (!selected || !newComment.trim()) return;
    startTransition(async () => {
      const r = await addCommentAction(selected.id, newComment.trim(), isInternal);
      if (r.ok) {
        setComments(prev => [...prev, r.data as TicketComment]);
        setNewComment('');
        notify('Comment added.', 'ok');
      } else notify(r.error, 'err');
    });
  }

  async function handleDelete() {
    if (!selected || !confirm('Delete this ticket?')) return;
    startTransition(async () => {
      const r = await deleteTicketAction(selected.id);
      if (r.ok) { setSelected(null); notify('Deleted.', 'ok'); router.refresh(); }
      else notify(r.error, 'err');
    });
  }

  const allowedNext = {
    OPEN:           ['IN_PROGRESS'],
    IN_PROGRESS:    ['WAITING_CLIENT','RESOLVED'],
    WAITING_CLIENT: ['IN_PROGRESS','RESOLVED'],
    RESOLVED:       ['CLOSED','IN_PROGRESS'],
    CLOSED:         [],
  }[selected?.status ?? 'OPEN'] ?? [];

  return (
    <PageShell
      listSlot={
        <>
          <ListHeader title="Tickets" count={tickets.total} />
          <div className="flex-1 overflow-y-auto">
            {tickets.items.length === 0 && (
              <div className="flex items-center justify-center py-12 text-[#484f58] text-sm">No tickets</div>
            )}
            {tickets.items.map(tkt => (
              <button key={tkt.id} onClick={() => selectTicket(tkt)}
                className={`w-full text-left flex border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.id === tkt.id ? 'bg-white/[0.05]' : ''}`}>
                <div className={`w-[3px] flex-shrink-0 ${STATUS_BAR[tkt.status] ?? 'bg-[#484f58]'}`} />
                <div className="flex-1 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#e6edf3] truncate">{tkt.title}</span>
                    <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">{relTime(tkt.created_at)}</span>
                  </div>
                  {tkt.project_id && <div className="text-[11px] text-[#484f58] truncate mt-0.5">Project: {tkt.project_id.slice(0, 12)}…</div>}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <PriBadge priority={tkt.priority} />
                    <Badge status={tkt.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      }
      detailSlot={
        !selected ? <EmptyDetail text="Select a ticket" /> : (
          <>
            <DetailHeader
              title={selected.title}
              sub={`Client: ${selected.client_id}${selected.project_id ? ' · Project: ' + selected.project_id : ''}`}
              badges={<><PriBadge priority={selected.priority} /><Badge status={selected.status} /></>}
              actions={
                <>
                  {isEmployee && allowedNext.map(s => (
                    <Btn key={s} variant={s === 'RESOLVED' || s === 'CLOSED' ? 'success' : 'secondary'}
                      onClick={() => handleStatusChange(s)} disabled={isPending} className="text-[11px]">
                      → {s.replace('_', ' ')}
                    </Btn>
                  ))}
                  {isAdmin && (
                    <Btn variant="danger" onClick={handleDelete} disabled={isPending}><Trash2 size={12} /></Btn>
                  )}
                </>
              }
            />

            {/* Comments thread — takes remaining height */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}

                {selected.description && (
                  <div className="bg-[#161b22] rounded-xl border border-white/[0.08] px-4 py-3 mb-2">
                    <p className="text-[10px] uppercase tracking-widest text-[#484f58] mb-1">Description</p>
                    <p className="text-sm text-[#8b949e] leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                  </div>
                )}

                {loadingComments && <p className="text-sm text-[#484f58]">Loading comments…</p>}

                {comments.map(cmt => (
                  <div key={cmt.id}
                    className={`rounded-xl border px-4 py-3 ${
                      cmt.is_internal
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : cmt.author_id === currentUser.id
                        ? 'bg-[#185FA5]/10 border-[#388bfd]/20 ml-8'
                        : 'bg-[#161b22] border-white/[0.08] mr-8'
                    }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {cmt.is_internal
                        ? <><Lock size={10} className="text-amber-400" /><span className="text-[10px] font-medium text-amber-400">Internal Note</span></>
                        : <><Globe size={10} className="text-[#484f58]" /><span className="text-[10px] text-[#484f58]">{cmt.author_id === currentUser.id ? 'You' : 'Client'}</span></>
                      }
                      <span className="text-[10px] font-mono text-[#484f58] ml-auto">{relTime(cmt.created_at)}</span>
                    </div>
                    <p className="text-[13px] text-[#e6edf3] leading-relaxed whitespace-pre-wrap">{cmt.message}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Comment compose */}
              <div className="flex-shrink-0 border-t border-white/[0.08] px-6 py-4 bg-[#0d1117]">
                {isEmployee && (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setIsInternal(false)}
                      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-colors ${!isInternal ? 'bg-[#1c2128] border-white/14 text-[#e6edf3]' : 'border-transparent text-[#484f58] hover:text-[#8b949e]'}`}>
                      <Globe size={10} /> Public reply
                    </button>
                    <button
                      onClick={() => setIsInternal(true)}
                      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-colors ${isInternal ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 'border-transparent text-[#484f58] hover:text-[#8b949e]'}`}>
                      <Lock size={10} /> Internal note
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    className={`flex-1 ${isInternal ? 'border-amber-500/25 bg-amber-500/5' : ''}`}
                    rows={2}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={isInternal ? 'Internal note — only visible to staff…' : 'Write a reply to the client…'}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAddComment(); }}
                  />
                  <Btn variant={isInternal ? 'secondary' : 'primary'} onClick={handleAddComment} loading={isPending} className="self-end h-9 px-3">
                    <Send size={13} />
                  </Btn>
                </div>
                <p className="text-[10px] text-[#484f58] mt-1">Ctrl+Enter to send</p>
              </div>
            </div>
          </>
        )
      }
    />
  );
}
