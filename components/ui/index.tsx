'use client';
import { type ReactNode } from 'react';

// ─── Badge / chip ──────────────────────────────────────────────────────────────
const PRIORITY_CLASSES = {
  URGENT: 'bg-red-500/15 text-red-400',
  HIGH:   'bg-amber-500/15 text-amber-400',
  MEDIUM: 'bg-blue-500/12 text-blue-400',
  LOW:    'bg-white/5 text-[#484f58]',
};

const STATUS_CLASSES: Record<string, string> = {
  // Inquiry
  NEW:          'bg-amber-500/15 text-amber-400',
  CONTACTED:    'bg-blue-500/12 text-blue-400',
  QUALIFIED:    'bg-teal-500/12 text-teal-400',
  CONVERTED:    'bg-green-500/12 text-green-400',
  REJECTED:     'bg-white/5 text-[#484f58]',
  // Project
  DRAFT:        'bg-white/5 text-[#484f58]',
  PLANNING:     'bg-blue-500/12 text-blue-400',
  ONBOARDING:   'bg-purple-500/12 text-purple-400',
  IN_PROGRESS:  'bg-amber-500/12 text-amber-400',
  ON_HOLD:      'bg-purple-500/12 text-purple-400',
  REVIEW:       'bg-teal-500/12 text-teal-400',
  COMPLETED:    'bg-green-500/12 text-green-400',
  CANCELLED:    'bg-red-500/10 text-red-400',
  // Onboarding
  PENDING:      'bg-amber-500/12 text-amber-400',
  SUBMITTED:    'bg-blue-500/12 text-blue-400',
  APPROVED:     'bg-green-500/12 text-green-400',
  // Milestone
  INVOICED:     'bg-blue-500/12 text-blue-400',
  PAID:         'bg-green-500/12 text-green-400',
  // Invoice
  SENT:         'bg-blue-500/12 text-blue-400',
  PARTIALLY_PAID: 'bg-amber-500/15 text-amber-400',
  OVERDUE:      'bg-red-500/15 text-red-400',
  // Ticket
  OPEN:         'bg-red-500/12 text-red-400',
  WAITING_CLIENT:'bg-purple-500/12 text-purple-400',
  RESOLVED:     'bg-green-500/12 text-green-400',
  CLOSED:       'bg-white/5 text-[#484f58]',
};

export function Badge({ status, className = '' }: { status: string; className?: string }) {
  const cls = STATUS_CLASSES[status] || 'bg-white/5 text-[#484f58]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${cls} ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function PriBadge({ priority }: { priority: string }) {
  const cls = PRIORITY_CLASSES[priority as keyof typeof PRIORITY_CLASSES] || 'bg-white/5 text-[#484f58]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${cls}`}>
      {priority}
    </span>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

const BTN_CLASSES: Record<BtnVariant, string> = {
  primary:   'bg-[#185FA5] border-[#185FA5] text-white hover:bg-[#0d4a85]',
  secondary: 'bg-[#1c2128] border-white/14 text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]',
  danger:    'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
  ghost:     'bg-transparent border-transparent text-[#8b949e] hover:bg-[#21262d] hover:border-white/8',
  success:   'bg-[#1a7f37] border-[#1a7f37] text-white hover:bg-[#116329]',
};

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  loading?: boolean;
  children: ReactNode;
}

export function Btn({ variant = 'secondary', loading, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-medium font-[var(--font-sans)] cursor-pointer transition-all active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed ${BTN_CLASSES[variant]} ${className}`}
    >
      {loading && <Loader size={12} />}
      {children}
    </button>
  );
}

// ─── Loader ────────────────────────────────────────────────────────────────────
export function Loader({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────────
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 px-2.5 rounded-md bg-[#1c2128] border border-white/14 text-[#e6edf3] text-[13px] outline-none focus:border-[#388bfd] focus:ring-2 focus:ring-[#388bfd]/15 placeholder:text-[#484f58] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-[var(--font-sans)] ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-9 px-2.5 rounded-md bg-[#1c2128] border border-white/14 text-[#e6edf3] text-[13px] outline-none focus:border-[#388bfd] cursor-pointer disabled:opacity-40 font-[var(--font-sans)] ${props.className ?? ''}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`px-2.5 py-2 rounded-md bg-[#1c2128] border border-white/14 text-[#e6edf3] text-[13px] outline-none focus:border-[#388bfd] focus:ring-2 focus:ring-[#388bfd]/15 placeholder:text-[#484f58] resize-y font-[var(--font-sans)] ${props.className ?? ''}`}
    />
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[.09em] font-semibold text-[#484f58] mb-2">{children}</div>;
}

// ─── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[#484f58] py-16">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Info table row ────────────────────────────────────────────────────────────
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-28 align-top">{label}</td>
      <td className="py-1.5 text-[12px] text-[#e6edf3] align-top">{children}</td>
    </tr>
  );
}

// ─── Error / success toast (inline) ───────────────────────────────────────────
export function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  if (!message) return null;
  const cls = type === 'error'
    ? 'bg-red-500/10 border-red-500/25 text-red-400'
    : 'bg-green-500/10 border-green-500/25 text-green-400';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm mb-3 ${cls}`}>
      {message}
    </div>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h3 className="text-sm font-semibold text-[#e6edf3]">{title}</h3>
          <button onClick={onClose} className="text-[#484f58] hover:text-[#8b949e] text-lg leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
