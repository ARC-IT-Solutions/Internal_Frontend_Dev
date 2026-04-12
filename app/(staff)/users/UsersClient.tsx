'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Paginated } from '@/types';
import { Badge, Btn, Select, Input, Alert, SectionLabel, Modal } from '@/components/ui';
import { PageShell, ListHeader, EmptyDetail, DetailHeader, DetailBody, Section } from '@/components/modules/PageShell';
import { fullDate, initials, relTime } from '@/lib/utils';
import { registerUserAction, updateUserAction } from '@/app/actions';
import { UserPlus, CheckCircle, XCircle, Copy } from 'lucide-react';

const ROLES = ['admin','employee','client'] as const;

const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-amber-500/15 text-amber-400',
  employee: 'bg-blue-500/12 text-blue-400',
  client:   'bg-green-500/12 text-green-400',
};

const AVATAR_BG: Record<string, string> = {
  admin:    'bg-[#854F0B]',
  employee: 'bg-[#185FA5]',
  client:   'bg-[#0F6E56]',
};

export function UsersClient({
  users,
  currentUser,
}: {
  users: Paginated<User>;
  currentUser: User;
}) {
  const router = useRouter();
  const [selected, setSelected]       = useState<User | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [copied, setCopied] = useState('');

  // Register form
  const [rf, setRf] = useState({ full_name: '', email: '', phone: '', password: '', role: 'client' });

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 6000);
  }

  async function handleRegister() {
    if (!rf.full_name || !rf.email || !rf.password) return setError('Name, email, and password are required.');
    startTransition(async () => {
      const r = await registerUserAction({ ...rf, phone: rf.phone || undefined });
      if (r.ok) {
        notify(`Account created! ID: ${(r.data as User).id}`, 'ok');
        setShowRegister(false);
        setRf({ full_name: '', email: '', phone: '', password: '', role: 'client' });
        router.refresh();
      } else notify(r.error, 'err');
    });
  }

  async function handleUpdate(field: string, value: unknown) {
    if (!selected) return;
    startTransition(async () => {
      const r = await updateUserAction(selected.id, { [field]: value });
      if (r.ok) {
        setSelected(r.data as User);
        notify('Updated.', 'ok');
        router.refresh();
      } else notify(r.error, 'err');
    });
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  return (
    <>
      <PageShell
        listSlot={
          <>
            <ListHeader
              title="Users"
              count={users.total}
              actions={
                <Btn variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setShowRegister(true)}>
                  <UserPlus size={12} /> Onboard
                </Btn>
              }
            />
            <div className="flex-1 overflow-y-auto">
              {users.items.length === 0 && (
                <div className="flex items-center justify-center py-12 text-[#484f58] text-sm">No users</div>
              )}
              {users.items.map(u => (
                <button key={u.id} onClick={() => setSelected(u)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.id === u.id ? 'bg-white/[0.05]' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ${AVATAR_BG[u.role] ?? 'bg-[#484f58]'}`}>
                    {initials(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[#e6edf3] truncate">{u.full_name}</span>
                      <span className="text-[10px] font-mono text-[#484f58]">{relTime(u.created_at)}</span>
                    </div>
                    <div className="text-[11px] text-[#484f58] truncate">{u.email}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${ROLE_COLORS[u.role] ?? ''}`}>{u.role}</span>
                      {!u.is_active && <span className="text-[9px] text-red-400 font-mono uppercase">Inactive</span>}
                      {!u.is_verified && <span className="text-[9px] text-[#484f58] font-mono uppercase">Unverified</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        }
        detailSlot={
          !selected ? <EmptyDetail text="Select a user or onboard a new one" /> : (
            <>
              <DetailHeader
                title={selected.full_name}
                sub={selected.email}
                badges={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${ROLE_COLORS[selected.role] ?? ''}`}>
                    {selected.role}
                  </span>
                }
              />
              <DetailBody>
                {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}

                <Section label="Account Info">
                  <table className="w-full"><tbody>
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-28">User ID</td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] font-mono text-[#e6edf3] bg-[#1c2128] px-2 py-0.5 rounded">{selected.id}</code>
                          <button onClick={() => copyToClipboard(selected.id, 'id')} className="text-[#484f58] hover:text-[#8b949e]">
                            <Copy size={11} />
                          </button>
                          {copied === 'id' && <span className="text-[10px] text-green-400">Copied!</span>}
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Phone</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{selected.phone ?? '—'}</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Active</td>
                      <td className="py-1.5">{selected.is_active
                        ? <span className="flex items-center gap-1 text-[12px] text-green-400"><CheckCircle size={12} /> Active</span>
                        : <span className="flex items-center gap-1 text-[12px] text-red-400"><XCircle size={12} /> Inactive</span>}
                      </td>
                    </tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Verified</td>
                      <td className="py-1.5">{selected.is_verified
                        ? <span className="flex items-center gap-1 text-[12px] text-green-400"><CheckCircle size={12} /> Verified</span>
                        : <span className="flex items-center gap-1 text-[12px] text-[#484f58]"><XCircle size={12} /> Unverified</span>}
                      </td>
                    </tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e]">Joined</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{fullDate(selected.created_at)}</td></tr>
                  </tbody></table>
                </Section>

                <Section label="Manage Account">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <SectionLabel>Role</SectionLabel>
                      <Select value={selected.role} onChange={e => handleUpdate('role', e.target.value)} className="w-full" disabled={isPending}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    </div>
                    <div>
                      <SectionLabel>Active</SectionLabel>
                      <Select value={String(selected.is_active)} onChange={e => handleUpdate('is_active', e.target.value === 'true')} className="w-full" disabled={isPending}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Select>
                    </div>
                    <div>
                      <SectionLabel>Verified</SectionLabel>
                      <Select value={String(selected.is_verified)} onChange={e => handleUpdate('is_verified', e.target.value === 'true')} className="w-full" disabled={isPending}>
                        <option value="true">Verified</option>
                        <option value="false">Unverified</option>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#484f58] mt-2 italic">Changes save immediately on selection.</p>
                </Section>
              </DetailBody>
            </>
          )
        }
      />

      {/* Register / Onboard modal */}
      {showRegister && (
        <Modal title="Onboard New User" onClose={() => setShowRegister(false)}>
          <p className="text-[11px] text-[#8b949e] mb-4">
            Creating a <strong className="text-[#e6edf3]">client</strong> account generates a unique user ID. Share the email and password with them so they can log in to the client portal.
          </p>
          {error && <Alert type="error" message={error} />}
          <div className="space-y-3">
            <div><SectionLabel>Full Name *</SectionLabel><Input className="w-full" value={rf.full_name} onChange={e => setRf({ ...rf, full_name: e.target.value })} /></div>
            <div><SectionLabel>Email *</SectionLabel><Input className="w-full" type="email" value={rf.email} onChange={e => setRf({ ...rf, email: e.target.value })} /></div>
            <div><SectionLabel>Phone</SectionLabel><Input className="w-full" type="tel" value={rf.phone} onChange={e => setRf({ ...rf, phone: e.target.value })} /></div>
            <div><SectionLabel>Temporary Password *</SectionLabel><Input className="w-full" type="password" placeholder="Min 8 chars, 1 number, 1 special" value={rf.password} onChange={e => setRf({ ...rf, password: e.target.value })} /></div>
            <div><SectionLabel>Role *</SectionLabel>
              <Select value={rf.role} onChange={e => setRf({ ...rf, role: e.target.value })} className="w-full">
                <option value="client">Client — gets client portal access</option>
                <option value="employee">Employee — gets console access</option>
                <option value="admin">Admin — full access</option>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Btn variant="primary" onClick={handleRegister} loading={isPending} className="flex-1 justify-center">
              <UserPlus size={13} /> Create Account
            </Btn>
            <Btn variant="ghost" onClick={() => setShowRegister(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
