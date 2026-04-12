'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, OnboardingData, User } from '@/types';
import {
  ArcBadge, ArcCard, ArcPageHeader, ArcLabel, ArcInput, ArcTextarea,
  ArcSelect, ArcBtn, ArcAlert, ArcRule, ArcEmpty,
} from '@/components/arc-ui';
import { submitOnboardingAction } from '@/app/actions';
import { CheckCircle, XCircle, ClipboardCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Enriched = Project & { onboarding: OnboardingData | null };

const ASSET_KEYS = [
  { key: 'logo',                label: 'Logo files (.png, .svg, .ai)' },
  { key: 'brand_guidelines',    label: 'Brand guidelines / style guide' },
  { key: 'existing_data_export',label: 'Existing data for migration' },
  { key: 'api_credentials',     label: 'API credentials / access tokens' },
];

export function ClientOnboardingClient({ projects }: { projects: Enriched[] }) {
  const router = useRouter();
  const [selected, setSelected]        = useState<Enriched | null>(
    projects.find(p => !p.onboarding || p.onboarding.status === 'REJECTED') ?? projects[0] ?? null
  );
  const [isPending, startTransition]   = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    business_name: '', business_details: '', requirements: '',
    target_audience: '', additional_notes: '',
    assets: Object.fromEntries(ASSET_KEYS.map(k => [k.key, false])) as Record<string, boolean>,
    cred_key1:'', cred_val1:'', cred_key2:'', cred_val2:'', cred_key3:'', cred_val3:'',
  });

  if (projects.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <ArcEmpty message="No projects require onboarding at this time." />
    </div>
  );

  const onb = selected?.onboarding;
  const isLocked = onb && onb.status !== 'REJECTED';

  async function handleSubmit() {
    if (!selected) return;
    if (!form.business_name || !form.requirements)
      return setError('Business name and requirements are required.');
    const credentials: Record<string,string> = {};
    if (form.cred_key1 && form.cred_val1) credentials[form.cred_key1] = form.cred_val1;
    if (form.cred_key2 && form.cred_val2) credentials[form.cred_key2] = form.cred_val2;
    if (form.cred_key3 && form.cred_val3) credentials[form.cred_key3] = form.cred_val3;
    startTransition(async () => {
      const r = await submitOnboardingAction(selected.id, {
        business_name: form.business_name, business_details: form.business_details || undefined,
        requirements: form.requirements, target_audience: form.target_audience || undefined,
        additional_notes: form.additional_notes || undefined,
        assets_provided: form.assets,
        credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      });
      if (r.ok) { setSuccess('Submitted! Your project manager will review shortly.'); router.refresh(); }
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ArcPageHeader
        title="Client"
        italic="Onboarding"
        sub="Complete this form so your team can deliver the best possible results."
      />

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-2xl mx-auto space-y-7">

          {/* Project selector */}
          {projects.length > 1 && (
            <div>
              <ArcLabel>Select Project</ArcLabel>
              <div className="space-y-2">
                {projects.map(p => (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className="w-full text-left flex items-center justify-between px-5 py-3.5 rounded-xl transition-colors"
                    style={{
                      border: `1px solid ${selected?.id === p.id ? 'var(--arc-border-md)' : 'var(--arc-border)'}`,
                      background: selected?.id === p.id ? 'rgba(201,168,76,0.05)' : 'var(--arc-bg-card)',
                    }}>
                    <span className="text-sm" style={{ color:'var(--arc-cream)' }}>{p.title}</span>
                    <ArcBadge status={p.onboarding?.status ?? 'PENDING'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status banner */}
          {onb && (
            <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
              style={{
                background: onb.status==='APPROVED' ? 'rgba(63,185,80,.06)' : onb.status==='REJECTED' ? 'rgba(232,107,107,.06)' : 'rgba(201,168,76,.06)',
                border: `1px solid ${onb.status==='APPROVED' ? 'rgba(63,185,80,.2)' : onb.status==='REJECTED' ? 'rgba(232,107,107,.2)' : 'rgba(201,168,76,.2)'}`,
              }}>
              {onb.status==='APPROVED' ? <CheckCircle size={16} style={{ color:'#5cb85c', flexShrink:0, marginTop:2 }} />
              : onb.status==='REJECTED' ? <AlertCircle size={16} style={{ color:'#e86b6b', flexShrink:0, marginTop:2 }} />
              : <ClipboardCheck size={16} style={{ color:'var(--arc-gold)', flexShrink:0, marginTop:2 }} />}
              <div>
                <p className="text-sm font-medium"
                  style={{ color: onb.status==='APPROVED' ? '#5cb85c' : onb.status==='REJECTED' ? '#e86b6b' : 'var(--arc-cream)' }}>
                  {onb.status==='SUBMITTED' ? 'Under review — your project manager will respond shortly.'
                   : onb.status==='APPROVED'  ? 'Approved! Your project is now starting.'
                   : 'Needs updates. Please correct and resubmit.'}
                </p>
                {onb.rejection_reason && (
                  <p className="text-xs mt-2 px-3 py-2 rounded-lg"
                    style={{ color:'#e86b6b', background:'rgba(232,107,107,.08)' }}>
                    {onb.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          {!isLocked && (
            <>
              {(error || success) && <ArcAlert type={error ? 'error' : 'success'} message={error || success} />}

              <div>
                <ArcLabel>Business Name *</ArcLabel>
                <ArcInput value={form.business_name} onChange={e => setForm({...form, business_name:e.target.value})} placeholder="Your company name" />
              </div>

              <div>
                <ArcLabel>About Your Business *</ArcLabel>
                <ArcTextarea rows={3} value={form.business_details}
                  onChange={e => setForm({...form, business_details:e.target.value})}
                  placeholder="Describe your company, industry, team size, and the problem you're looking to solve…" />
              </div>

              <div>
                <ArcLabel>Project Requirements *</ArcLabel>
                <ArcTextarea rows={5} value={form.requirements}
                  onChange={e => setForm({...form, requirements:e.target.value})}
                  placeholder="Be as detailed as possible — features, integrations, platforms, user types, technical requirements, timelines…" />
              </div>

              <div>
                <ArcLabel>Target Audience</ArcLabel>
                <ArcInput value={form.target_audience}
                  onChange={e => setForm({...form, target_audience:e.target.value})}
                  placeholder="Who will use this? e.g. B2B companies, consumers, internal employees" />
              </div>

              {/* Assets */}
              <div>
                <ArcLabel>Assets You Can Provide</ArcLabel>
                <p className="text-[11px] mb-3" style={{ color:'var(--arc-mute)' }}>
                  Select all assets ready to share with the team.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ASSET_KEYS.map(({ key, label }) => {
                    const checked = form.assets[key];
                    return (
                      <button key={key} type="button"
                        onClick={() => setForm({...form, assets:{...form.assets, [key]:!checked}})}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                        style={{
                          border: `1px solid ${checked ? 'rgba(63,185,80,.3)' : 'var(--arc-border)'}`,
                          background: checked ? 'rgba(63,185,80,.06)' : 'var(--arc-bg-card)',
                        }}>
                        <div className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                          style={{ borderColor: checked ? '#5cb85c' : 'var(--arc-mute)', background: checked ? '#5cb85c' : 'transparent' }}>
                          {checked && <svg viewBox="0 0 8 8" className="w-2.5 h-2.5"><path d="M1 4l2 2 4-4" stroke="#0e0c09" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                        </div>
                        <span className="text-[12px]" style={{ color: checked ? '#5cb85c' : 'var(--arc-mute)' }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Credentials */}
              <div>
                <ArcLabel>Technical Credentials & Access Info</ArcLabel>
                <p className="text-[11px] mb-3" style={{ color:'var(--arc-mute)' }}>
                  Optional — add any API keys, hosting details, or access tokens the team will need.
                </p>
                <div className="space-y-2">
                  {[1,2,3].map(n => (
                    <div key={n} className="grid grid-cols-2 gap-2">
                      <ArcInput
                        value={(form as Record<string,string>)[`cred_key${n}`]}
                        onChange={e => setForm({...form, [`cred_key${n}`]:e.target.value})}
                        placeholder="e.g. Hosting provider" />
                      <ArcInput
                        value={(form as Record<string,string>)[`cred_val${n}`]}
                        onChange={e => setForm({...form, [`cred_val${n}`]:e.target.value})}
                        placeholder="Value or account name" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <ArcLabel>Additional Notes</ArcLabel>
                <ArcTextarea rows={2} value={form.additional_notes}
                  onChange={e => setForm({...form, additional_notes:e.target.value})}
                  placeholder="Anything else — deadlines, constraints, preferences, references…" />
              </div>

              <div className="pt-2">
                <ArcBtn variant="gold" onClick={handleSubmit} loading={isPending} className="w-full justify-center h-11 text-sm">
                  <ClipboardCheck size={15} /> Submit Onboarding
                </ArcBtn>
              </div>

              <ArcRule />
              <p className="text-center text-[11px]" style={{ color:'var(--arc-dim)', fontFamily:'var(--font-serif)', fontStyle:'italic' }}>
                All information is kept strictly confidential within your project team.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
