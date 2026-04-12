'use client';
import { type ReactNode } from 'react';

export function PageShell({
  listSlot,
  detailSlot,
}: {
  listSlot: ReactNode;
  detailSlot: ReactNode;
}) {
  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* List pane */}
      <div className="w-80 flex-shrink-0 border-r border-white/[0.08] flex flex-col overflow-hidden bg-[#161b22]">
        {listSlot}
      </div>
      {/* Detail pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
        {detailSlot}
      </div>
    </div>
  );
}

export function ListHeader({
  title,
  count,
  actions,
  filters,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  filters?: ReactNode;
}) {
  return (
    <div className="flex-shrink-0 border-b border-white/[0.04]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#484f58]">{title}</span>
        {count !== undefined && (
          <span className="ml-1 text-[10px] font-mono text-[#484f58]">{count}</span>
        )}
        {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
      </div>
      {filters && <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">{filters}</div>}
    </div>
  );
}

export function EmptyDetail({ text = 'Select an item to view details' }: { text?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-[#484f58] text-sm">{text}</div>
  );
}

export function DetailHeader({
  title,
  sub,
  badges,
  actions,
}: {
  title: string;
  sub?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.08]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[#e6edf3] truncate">{title}</h2>
          {sub && <p className="text-xs text-[#8b949e] mt-0.5 truncate">{sub}</p>}
          {badges && <div className="flex items-center gap-1.5 mt-2 flex-wrap">{badges}</div>}
        </div>
        {actions && <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export function DetailBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">{children}</div>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-[#484f58] mb-3">{label}</div>
      {children}
    </div>
  );
}
