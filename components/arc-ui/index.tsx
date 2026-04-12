'use client';

/**
 * ARC UI — branded components for the client portal.
 * Matches ARC IT Solutions aesthetic: dark warm bg, cream serif text, gold accents.
 */

import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; text: string }> = {
  PAID:           { bg: 'rgba(63,185,80,.1)',    text: '#5cb85c' },
  PARTIALLY_PAID: { bg: 'rgba(201,168,76,.12)',  text: 'var(--arc-gold)' },
  SENT:           { bg: 'rgba(201,168,76,.08)',  text: 'var(--arc-mute)' },
  OVERDUE:        { bg: 'rgba(232,107,107,.12)', text: '#e86b6b' },
  DRAFT:          { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' },
  CANCELLED:      { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' },
  IN_PROGRESS:    { bg: 'rgba(201,168,76,.12)',  text: 'var(--arc-gold)' },
  PLANNING:       { bg: 'rgba(255,255,255,.06)', text: 'var(--arc-mute)' },
  ONBOARDING:     { bg: 'rgba(201,168,76,.1)',   text: 'var(--arc-gold)' },
  COMPLETED:      { bg: 'rgba(63,185,80,.1)',    text: '#5cb85c' },
  ON_HOLD:        { bg: 'rgba(232,107,107,.08)', text: '#e86b6b' },
  REVIEW:         { bg: 'rgba(201,168,76,.12)',  text: 'var(--arc-gold-lt)' },
  OPEN:           { bg: 'rgba(232,107,107,.1)',  text: '#e86b6b' },
  RESOLVED:       { bg: 'rgba(63,185,80,.1)',    text: '#5cb85c' },
  CLOSED:         { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' },
  WAITING_CLIENT: { bg: 'rgba(201,168,76,.1)',   text: 'var(--arc-gold)' },
  PENDING:        { bg: 'rgba(201,168,76,.08)',  text: 'var(--arc-mute)' },
  SUBMITTED:      { bg: 'rgba(201,168,76,.1)',   text: 'var(--arc-gold)' },
  APPROVED:       { bg: 'rgba(63,185,80,.1)',    text: '#5cb85c' },
  REJECTED:       { bg: 'rgba(232,107,107,.1)',  text: '#e86b6b' },
  INVOICED:       { bg: 'rgba(201,168,76,.1)',   text: 'var(--arc-gold)' },
};

export function ArcBadge({ status, className = '' }: { status: string; className?: string }) {
  const s = STATUS_MAP[status] ?? { bg: 'rgba(255,255,255,.04)', text: 'var(--arc-mute)' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${className}`}
      style={{ background: s.bg, color: s.text, fontFamily: 'var(--font-mono)' }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────
export function ArcHeading({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-1">
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-cream)', fontWeight: 600, fontSize: '1.15rem' }}>
          {children}
        </h2>
        <div className="h-px w-10" style={{ background: 'var(--arc-gold)', opacity: .3 }} />
      </div>
      {sub && <p className="text-xs" style={{ color: 'var(--arc-mute)' }}>{sub}</p>}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
export function ArcLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] tracking-[.14em] uppercase mb-2"
      style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>
      {children}
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
export function ArcCard({ children, className = '', padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={`rounded-xl ${padded ? 'p-6' : ''} ${className}`}
      style={{ background: 'var(--arc-bg-card)', border: '1px solid var(--arc-border)' }}>
      {children}
    </div>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────────
type ArcBtnVariant = 'gold' | 'ghost' | 'danger' | 'outline';

const BTN_STYLES: Record<ArcBtnVariant, React.CSSProperties> = {
  gold:    { background: 'var(--arc-gold)', color: '#0e0c09', border: 'none', fontWeight: 600 },
  ghost:   { background: 'transparent', color: 'var(--arc-mute)', border: '1px solid var(--arc-border)' },
  danger:  { background: 'rgba(232,107,107,.1)', color: '#e86b6b', border: '1px solid rgba(232,107,107,.25)' },
  outline: { background: 'transparent', color: 'var(--arc-gold)', border: '1px solid var(--arc-border-md)' },
};

interface ArcBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ArcBtnVariant;
  loading?: boolean;
  children: ReactNode;
}

export function ArcBtn({ variant = 'ghost', loading, children, className = '', disabled, style = {}, ...rest }: ArcBtnProps) {
  return (
    <button {...rest} disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.98] ${className}`}
      style={{ ...BTN_STYLES[variant], fontFamily: 'var(--font-sans)', ...style }}>
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────────
export function ArcInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`h-10 px-3 rounded-lg text-sm w-full outline-none transition-colors ${props.className ?? ''}`}
      style={{
        background:  'var(--arc-bg)',
        color:       'var(--arc-cream)',
        border:      '1px solid var(--arc-border)',
        fontFamily:  'var(--font-sans)',
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--arc-border-md)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--arc-border)'; }}
    />
  );
}

export function ArcTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props}
      className={`px-3 py-2.5 rounded-lg text-sm w-full outline-none resize-y transition-colors ${props.className ?? ''}`}
      style={{
        background: 'var(--arc-bg)',
        color:      'var(--arc-cream)',
        border:     '1px solid var(--arc-border)',
        fontFamily: 'var(--font-sans)',
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--arc-border-md)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--arc-border)'; }}
    />
  );
}

export function ArcSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props}
      className={`h-10 px-3 rounded-lg text-sm w-full outline-none cursor-pointer ${props.className ?? ''}`}
      style={{
        background: 'var(--arc-bg)',
        color:      'var(--arc-cream)',
        border:     '1px solid var(--arc-border)',
        fontFamily: 'var(--font-sans)',
        ...props.style,
      }}
    />
  );
}

// ─── Alert ─────────────────────────────────────────────────────────────────────
export function ArcAlert({ type, message }: { type: 'error' | 'success' | 'info'; message: string }) {
  if (!message) return null;
  const styles = {
    error:   { bg: 'rgba(232,107,107,.08)', border: 'rgba(232,107,107,.25)', text: '#e86b6b' },
    success: { bg: 'rgba(63,185,80,.08)',   border: 'rgba(63,185,80,.25)',   text: '#5cb85c' },
    info:    { bg: 'rgba(201,168,76,.08)',  border: 'rgba(201,168,76,.25)',  text: 'var(--arc-gold)' },
  }[type];
  return (
    <div className="px-4 py-3 rounded-lg text-sm mb-4"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}>
      {message}
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export function ArcModal({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(14,12,9,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--arc-bg-card)', border: '1px solid var(--arc-border-md)' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--arc-border)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--arc-ivory)', fontWeight: 600, fontSize: '1rem' }}>
              {title}
            </h3>
            {sub && <p className="text-xs mt-1" style={{ color: 'var(--arc-mute)' }}>{sub}</p>}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--arc-mute)' }}>
            ×
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Page header (used on each client page) ────────────────────────────────────
export function ArcPageHeader({ title, italic, sub, action }: {
  title: string; italic?: string; sub?: string; action?: ReactNode;
}) {
  return (
    <div className="px-10 pt-10 pb-7 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--arc-border)' }}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] tracking-[.16em] uppercase" style={{ color: 'var(--arc-mute)' }}>ARC IT Solutions</span>
            <div className="h-px w-8" style={{ background: 'var(--arc-gold)', opacity: .35 }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.1, color: 'var(--arc-ivory)' }}>
            {title}
            {italic && <> <span style={{ fontStyle: 'italic', color: 'var(--arc-gold)' }}>{italic}</span></>}
          </h1>
          {sub && <p className="text-sm mt-1.5" style={{ color: 'var(--arc-mute)' }}>{sub}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

// ─── Gold rule ─────────────────────────────────────────────────────────────────
export function ArcRule() {
  return <div className="arc-rule my-2" />;
}

// ─── Info table row ────────────────────────────────────────────────────────────
export function ArcInfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--arc-border)' }}>
      <td className="py-2.5 pr-6 text-[11px] uppercase tracking-widest align-top w-36"
        style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>
        {label}
      </td>
      <td className="py-2.5 text-[13px] align-top" style={{ color: 'var(--arc-cream)' }}>
        {children}
      </td>
    </tr>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
export function ArcEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-base" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--arc-mute)' }}>
        {message}
      </p>
    </div>
  );
}
