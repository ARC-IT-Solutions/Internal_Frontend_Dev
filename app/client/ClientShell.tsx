'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import type { User } from '@/types';
import {
  LayoutDashboard, FolderKanban, Ticket, FileText,
  ClipboardList, LogOut, User as UserIcon,
} from 'lucide-react';

const NAV = [
  { href: '/client',            label: 'Overview',    icon: LayoutDashboard, exact: true },
  { href: '/client/projects',   label: 'My Projects', icon: FolderKanban },
  { href: '/client/onboarding', label: 'Onboarding',  icon: ClipboardList },
  { href: '/client/tickets',    label: 'Support',     icon: Ticket },
  { href: '/client/invoices',   label: 'Invoices',    icon: FileText },
  { href: '/client/profile',    label: 'Profile',     icon: UserIcon },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function ClientShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="client-portal flex h-screen overflow-hidden" style={{ background: 'var(--arc-bg)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-52 flex-shrink-0 flex flex-col"
        style={{ background: 'var(--arc-bg-raised)', borderRight: '1px solid var(--arc-border)' }}>

        {/* Brand */}
        <div className="px-6 h-16 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--arc-border)' }}>
          {/* Small gold logotype mark */}
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--arc-gold)', color: '#0e0c09' }}>
            <span className="text-[11px] font-bold" style={{ fontFamily: 'var(--font-serif)' }}>A</span>
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-serif)' }}>
              ARC IT
            </div>
            <div className="text-[10px]" style={{ color: 'var(--arc-mute)' }}>Client Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg text-[13px] transition-all duration-150"
                style={{
                  color:      active ? 'var(--arc-gold)'  : 'var(--arc-mute)',
                  background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                  fontWeight: active ? '500' : '400',
                }}>
                <Icon size={14} style={{ opacity: active ? 1 : 0.6 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Thin gold rule */}
        <div className="arc-rule mx-4" />

        {/* User footer */}
        <div className="p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--arc-gold)', fontFamily: 'var(--font-sans)' }}>
              {initials(user.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: 'var(--arc-cream)' }}>{user.full_name}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--arc-mute)' }}>Client</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" title="Sign out"
                className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                style={{ color: 'var(--arc-mute)', border: '1px solid var(--arc-border)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#e86b6b'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--arc-mute)'; }}>
                <LogOut size={12} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
