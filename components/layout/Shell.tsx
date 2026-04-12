'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import type { User } from '@/types';
import {
  Inbox, Ticket, FolderKanban, FileText, Users,
  ScrollText, LogOut, ChevronRight, ClipboardList,
  Milestone, CreditCard,
} from 'lucide-react';

const NAV_EMPLOYEE = [
  { href: '/inquiries',        label: 'Inquiries',        icon: Inbox },
  { href: '/tickets',          label: 'Tickets',           icon: Ticket },
  { href: '/projects',         label: 'Projects',          icon: FolderKanban },
  { href: '/onboarding',       label: 'Onboarding',        icon: ClipboardList },
  { href: '/milestones',       label: 'Milestones',        icon: Milestone },
  { href: '/invoices',         label: 'Invoices',          icon: FileText },
  { href: '/payments',         label: 'Payments',          icon: CreditCard },
];

const NAV_ADMIN_EXTRA = [
  { href: '/users',  label: 'Users',       icon: Users },
  { href: '/audit',  label: 'Audit Logs',  icon: ScrollText },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-amber-500/15 text-amber-400',
  employee: 'bg-blue-500/12 text-blue-400',
};

export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();

  const nav = user.role === 'admin'
    ? [...NAV_EMPLOYEE, ...NAV_ADMIN_EXTRA]
    : NAV_EMPLOYEE;

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-[#161b22] border-r border-white/[0.08] flex flex-col">
        {/* Brand */}
        <div className="px-4 h-12 flex items-center gap-2 border-b border-white/[0.08]">
          <div className="w-2 h-2 rounded-full bg-[#f0883e]" />
          <span className="text-sm font-semibold text-[#e6edf3] tracking-tight">Lead Console</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2 mx-2 rounded-md text-[13px] transition-colors group ${
                  active
                    ? 'bg-white/[0.06] text-[#e6edf3] font-medium'
                    : 'text-[#8b949e] hover:bg-white/[0.04] hover:text-[#e6edf3]'
                }`}>
                <Icon size={14} className={active ? 'text-[#f0883e]' : 'group-hover:text-[#e6edf3]'} />
                {label}
                {active && <ChevronRight size={12} className="ml-auto text-[#484f58]" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#185FA5] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
              {initials(user.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#e6edf3] truncate">{user.full_name}</div>
              <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${ROLE_COLORS[user.role] ?? 'bg-white/5 text-[#484f58]'}`}>
                {user.role}
              </div>
            </div>
            <form action={logoutAction}>
              <button type="submit" title="Sign out"
                className="w-7 h-7 rounded-md border border-white/[0.08] flex items-center justify-center text-[#484f58] hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-colors">
                <LogOut size={12} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
