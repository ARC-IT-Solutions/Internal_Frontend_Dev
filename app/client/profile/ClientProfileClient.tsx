'use client';

import { useState, useTransition } from 'react';
import type { User } from '@/types';
import {
  ArcCard, ArcPageHeader, ArcLabel, ArcInput, ArcBtn, ArcAlert, ArcRule,
} from '@/components/arc-ui';
import { updateMeAction, changePasswordAction } from '@/app/actions';
import { UserCircle2, KeyRound } from 'lucide-react';

export function ClientProfileClient({ currentUser }: { currentUser: User }) {
  const [isPending, startTransition] = useTransition();
  const [profileMsg, setProfileMsg]  = useState({ type: '', text: '' });
  const [pwMsg, setPwMsg]            = useState({ type: '', text: '' });

  const [name,  setName]  = useState(currentUser.full_name);
  const [phone, setPhone] = useState(currentUser.phone ?? '');

  const [curPw,  setCurPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');

  function initials(n: string) { return n.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }

  async function saveProfile() {
    if (!name.trim()) return;
    startTransition(async () => {
      const r = await updateMeAction({ full_name: name.trim(), phone: phone.trim() || undefined });
      if (r.ok) setProfileMsg({ type: 'success', text: 'Profile updated.' });
      else      setProfileMsg({ type: 'error',   text: r.error });
    });
  }

  async function changePassword() {
    if (newPw !== confPw)   return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    if (newPw.length < 8)   return setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
    startTransition(async () => {
      const r = await changePasswordAction(curPw, newPw);
      if (r.ok) {
        setPwMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurPw(''); setNewPw(''); setConfPw('');
      } else setPwMsg({ type: 'error', text: r.error });
    });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ArcPageHeader
        title="Your"
        italic="Profile"
        sub="Manage your account details and security settings."
      />

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-lg mx-auto space-y-8">

          {/* Avatar + identity */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--arc-gold)', fontFamily: 'var(--font-serif)' }}>
              {initials(currentUser.full_name)}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-ivory)', fontWeight: 600, fontSize: '1.2rem' }}>
                {currentUser.full_name}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--arc-mute)' }}>{currentUser.email}</p>
              <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px]"
                style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--arc-gold)', fontFamily: 'var(--font-mono)' }}>
                CLIENT
              </div>
            </div>
          </div>

          <ArcRule />

          {/* Edit profile */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <UserCircle2 size={14} style={{ color: 'var(--arc-gold)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-cream)', fontWeight: 600 }}>
                Personal Information
              </h3>
            </div>

            {profileMsg.text && <ArcAlert type={profileMsg.type as 'error' | 'success'} message={profileMsg.text} />}

            <div className="space-y-4">
              <div>
                <ArcLabel>Full Name</ArcLabel>
                <ArcInput value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <ArcLabel>Phone Number</ArcLabel>
                <ArcInput value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+91…" />
              </div>
              <div>
                <ArcLabel>Email Address</ArcLabel>
                <ArcInput value={currentUser.email} disabled style={{ opacity: 0.5 }} />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--arc-mute)' }}>
                  Email cannot be changed. Contact your project manager if needed.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <ArcBtn variant="gold" onClick={saveProfile} loading={isPending}>
                Save Changes
              </ArcBtn>
            </div>
          </div>

          <ArcRule />

          {/* Change password */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <KeyRound size={14} style={{ color: 'var(--arc-gold)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-cream)', fontWeight: 600 }}>
                Change Password
              </h3>
            </div>

            {pwMsg.text && <ArcAlert type={pwMsg.type as 'error' | 'success'} message={pwMsg.text} />}

            <div className="space-y-4">
              <div>
                <ArcLabel>Current Password</ArcLabel>
                <ArcInput type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Your current password" />
              </div>
              <div>
                <ArcLabel>New Password</ArcLabel>
                <ArcInput type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div>
                <ArcLabel>Confirm New Password</ArcLabel>
                <ArcInput type="password" value={confPw} onChange={e => setConfPw(e.target.value)} placeholder="Repeat new password" />
              </div>
            </div>

            <div className="mt-5">
              <ArcBtn variant="outline" onClick={changePassword} loading={isPending}>
                <KeyRound size={13} /> Update Password
              </ArcBtn>
            </div>
          </div>

          <ArcRule />

          <p className="text-center text-[11px]"
            style={{ color: 'var(--arc-dim)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
            ARC IT Solutions — crafting software and design that endures.
          </p>
        </div>
      </div>
    </div>
  );
}
