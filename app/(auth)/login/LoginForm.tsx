'use client';

import { useState } from 'react';
import { loginAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginForm({ initialError }: { initialError: string }) {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    const result = await loginAction(email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error); setPassword(''); return; }
    const role = (result.data as { role: string }).role;
    router.push(role === 'client' ? '/client' : '/');
  }

  return (
    <div className="client-portal flex min-h-screen" style={{ background: 'var(--arc-bg)' }}>

      {/* ── Left: brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'var(--arc-bg-raised)', borderRight: '1px solid var(--arc-border)' }}>

        {/* Subtle grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(201,168,76,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Ambient glow */}
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,.06) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: 'var(--arc-gold)' }}>
              <span className="text-sm font-bold text-[#0e0c09]" style={{ fontFamily: 'var(--font-serif)' }}>A</span>
            </div>
            <span className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-serif)' }}>
              ARC IT <span style={{ color: 'var(--arc-gold)' }}>Solutions</span>
            </span>
          </div>

          {/* Headline — mirrors arcit.in aesthetic */}
          <div className="mb-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] tracking-[.18em] uppercase"
                style={{ color: 'var(--arc-mute)' }}>
                EST. 2012 — CLIENT PORTAL
              </span>
              <div className="h-px w-10" style={{ background: 'var(--arc-gold)', opacity: .4 }} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize:   '2.4rem',
              lineHeight: 1.15,
              color:      'var(--arc-cream)',
            }}>
              We craft software<br />
              <span style={{ fontStyle: 'italic', color: 'var(--arc-gold)' }}>and design</span><br />
              that endures.
            </h1>
          </div>

          <p className="text-sm leading-relaxed mb-12" style={{ color: 'var(--arc-mute)' }}>
            Sign in to track your project, view invoices,
            raise support tickets, and stay in sync with your team.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              'Real-time project progress',
              'Invoice & payment history',
              'Direct support ticketing',
              'Onboarding & documentation',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: 'var(--arc-gold)' }} />
                <span className="text-[13px]" style={{ color: 'var(--arc-mute)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="arc-rule mb-4" />
          <p className="text-[11px]" style={{ color: 'var(--arc-dim)', fontFamily: 'var(--font-mono)' }}>
            arcit.in — software &amp; design
          </p>
        </div>
      </div>

      {/* ── Right: form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[360px]">

          {/* Mobile-only brand */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: 'var(--arc-gold)' }}>
              <span className="text-[11px] font-bold text-[#0e0c09]"
                style={{ fontFamily: 'var(--font-serif)' }}>A</span>
            </div>
            <span className="text-sm font-semibold"
              style={{ color: 'var(--arc-cream)', fontFamily: 'var(--font-serif)' }}>
              ARC IT Solutions
            </span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] tracking-[.15em] uppercase"
                style={{ color: 'var(--arc-mute)' }}>Sign In</span>
              <div className="h-px w-8" style={{ background: 'var(--arc-gold)', opacity: .4 }} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              color:      'var(--arc-ivory)',
              fontWeight: 700,
              fontSize:   '1.5rem',
            }}>
              Welcome back.
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--arc-mute)' }}>
              Staff and clients share this entry point.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm mb-5"
              style={{
                background: 'rgba(232,107,107,.08)',
                border:     '1px solid rgba(232,107,107,.25)',
                color:      '#e86b6b',
              }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] tracking-[.12em] uppercase mb-2"
                style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                className="w-full h-11 px-4 rounded-xl outline-none text-sm transition-all"
                style={{
                  background: 'var(--arc-bg-card)',
                  border:     '1px solid var(--arc-border)',
                  color:      'var(--arc-cream)',
                  fontFamily: 'var(--font-sans)',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--arc-border-md)';
                  e.target.style.boxShadow   = '0 0 0 3px rgba(201,168,76,0.08)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--arc-border)';
                  e.target.style.boxShadow   = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] tracking-[.12em] uppercase mb-2"
                style={{ color: 'var(--arc-mute)', fontFamily: 'var(--font-sans)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 px-4 pr-11 rounded-xl outline-none text-sm transition-all"
                  style={{
                    background: 'var(--arc-bg-card)',
                    border:     '1px solid var(--arc-border)',
                    color:      'var(--arc-cream)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--arc-border-md)';
                    e.target.style.boxShadow   = '0 0 0 3px rgba(201,168,76,0.08)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--arc-border)';
                    e.target.style.boxShadow   = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                  style={{ color: 'var(--arc-mute)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: 'var(--arc-gold)', color: '#0e0c09', fontFamily: 'var(--font-sans)' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-[11px] mt-8"
            style={{
              color:       'var(--arc-dim)',
              fontFamily:  'var(--font-serif)',
              fontStyle:   'italic',
            }}>
            Forgot your password? Contact your project manager.
          </p>
        </div>
      </div>
    </div>
  );
}
