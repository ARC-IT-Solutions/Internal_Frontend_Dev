'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingData, Project, User } from '@/types';
import { Badge, Btn, Select, Textarea, Alert, SectionLabel, Input } from '@/components/ui';
import { DetailHeader, DetailBody, Section } from '@/components/modules/PageShell';
import { fullDate } from '@/lib/utils';
import { reviewOnboardingAction } from '@/app/actions';
import { onboardingApi } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { CheckCircle, XCircle, ClipboardList } from 'lucide-react';

export function OnboardingClient({
  projects,
  initialOnboarding,
  initialProjectId,
  currentUser,
}: {
  projects: Project[];
  initialOnboarding: OnboardingData | null;
  initialProjectId: string | null;
  currentUser: User;
}) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '');
  const [onboarding, setOnboarding]               = useState<OnboardingData | null>(initialOnboarding);
  const [loading, setLoading]                     = useState(false);
  const [isPending, startTransition]              = useTransition();
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const isEmployee = currentUser.role !== 'client';

  function notify(msg: string, type: 'ok' | 'err') {
    type === 'ok' ? (setSuccess(msg), setError('')) : (setError(msg), setSuccess(''));
    setTimeout(() => { setSuccess(''); setError(''); }, 5000);
  }

  async function loadOnboarding(projectId: string) {
    if (!projectId) { setOnboarding(null); return; }
    setLoading(true);
    try {
      // Fetch from client side using the cookie session
      const res = await fetch(`/api/proxy/onboarding/${projectId}`);
      const data = await res.json();
      setOnboarding(data.onboarding ?? null);
    } catch { setOnboarding(null); }
    setLoading(false);
  }

  async function handleReview(status: 'APPROVED' | 'REJECTED') {
    if (!selectedProjectId) return;
    if (status === 'REJECTED' && !rejectReason) return setError('Please provide a rejection reason.');
    startTransition(async () => {
      const r = await reviewOnboardingAction(selectedProjectId, status, rejectReason || undefined);
      if (r.ok) {
        setOnboarding(r.data as OnboardingData);
        setShowRejectInput(false);
        notify(status === 'APPROVED' ? 'Onboarding approved! Project can now move to IN_PROGRESS.' : 'Onboarding rejected.', 'ok');
        router.refresh();
      } else notify(r.error, 'err');
    });
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  function renderAssets(assets: Record<string, boolean> | undefined) {
    if (!assets) return <span className="text-[#484f58]">—</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(assets).map(([key, val]) => (
          <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${val ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-[#484f58]'}`}>
            {val ? <CheckCircle size={10} /> : <XCircle size={10} />}
            {key.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.08] flex items-center gap-4">
        <ClipboardList size={16} className="text-[#f0883e]" />
        <h1 className="text-sm font-semibold text-[#e6edf3]">Client Onboarding</h1>
        <Select
          value={selectedProjectId}
          onChange={e => { setSelectedProjectId(e.target.value); loadOnboarding(e.target.value); }}
          className="ml-auto w-72"
        >
          <option value="">Select a project…</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
          ))}
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!selectedProjectId && (
          <div className="flex flex-col items-center justify-center py-24 text-[#484f58]">
            <ClipboardList size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Select a project to view its onboarding data</p>
          </div>
        )}

        {selectedProjectId && loading && (
          <div className="flex items-center justify-center py-24 text-[#484f58] text-sm">Loading…</div>
        )}

        {selectedProjectId && !loading && !onboarding && (
          <div className="flex flex-col items-center justify-center py-24 text-[#484f58]">
            <p className="text-sm">No onboarding submitted for this project yet.</p>
            {selectedProject && <p className="text-xs mt-1 font-mono">{selectedProject.status}</p>}
          </div>
        )}

        {selectedProjectId && !loading && onboarding && (
          <div className="max-w-2xl space-y-6">
            {(error || success) && <Alert type={error ? 'error' : 'success'} message={error || success} />}

            {/* Status banner */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              onboarding.status === 'APPROVED' ? 'bg-green-500/10 border-green-500/20' :
              onboarding.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/20' :
              onboarding.status === 'SUBMITTED' ? 'bg-blue-500/10 border-blue-500/20' :
              'bg-white/5 border-white/8'
            }`}>
              <div>
                <p className="text-sm font-medium text-[#e6edf3]">Onboarding Status</p>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Submitted {fullDate(onboarding.submitted_at)}
                  {onboarding.approved_at && ` · Reviewed ${fullDate(onboarding.approved_at)}`}
                </p>
              </div>
              <Badge status={onboarding.status} />
            </div>

            {onboarding.rejection_reason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-red-400 mb-1">Rejection Reason</p>
                <p className="text-sm text-[#e6edf3]">{onboarding.rejection_reason}</p>
              </div>
            )}

            <Section label="Business Information">
              <table className="w-full"><tbody>
                <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-36 align-top">Business Name</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{onboarding.business_name ?? '—'}</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] align-top">Details</td><td className="py-1.5 text-[12px] text-[#e6edf3] whitespace-pre-wrap">{onboarding.business_details ?? '—'}</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-1.5 pr-4 text-[11px] text-[#8b949e] align-top">Target Audience</td><td className="py-1.5 text-[12px] text-[#e6edf3]">{onboarding.target_audience ?? '—'}</td></tr>
              </tbody></table>
            </Section>

            <Section label="Requirements">
              <blockquote className="bg-[#161b22] border border-white/[0.08] border-l-[3px] border-l-white/14 rounded-lg px-4 py-3 text-sm text-[#8b949e] leading-relaxed whitespace-pre-wrap">
                {onboarding.requirements ?? '—'}
              </blockquote>
            </Section>

            <Section label="Assets Provided">
              {renderAssets(onboarding.assets_provided)}
            </Section>

            {onboarding.credentials && Object.keys(onboarding.credentials).length > 0 && (
              <Section label="Credentials / Technical Info">
                <table className="w-full"><tbody>
                  {Object.entries(onboarding.credentials).map(([k, v]) => (
                    <tr key={k} className="border-b border-white/[0.04]">
                      <td className="py-1.5 pr-4 text-[11px] text-[#8b949e] w-48 capitalize">{k.replace(/_/g, ' ')}</td>
                      <td className="py-1.5 text-[12px] font-mono text-[#e6edf3]">{v}</td>
                    </tr>
                  ))}
                </tbody></table>
              </Section>
            )}

            {onboarding.additional_notes && (
              <Section label="Additional Notes">
                <p className="text-sm text-[#8b949e]">{onboarding.additional_notes}</p>
              </Section>
            )}

            {/* Review actions — employee only, only when SUBMITTED */}
            {isEmployee && onboarding.status === 'SUBMITTED' && (
              <Section label="Review Decision">
                {showRejectInput && (
                  <div className="mb-3">
                    <SectionLabel>Rejection Reason *</SectionLabel>
                    <Textarea className="w-full" rows={2} value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Explain what the client needs to fix…" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Btn variant="success" onClick={() => handleReview('APPROVED')} loading={isPending}>
                    <CheckCircle size={13} /> Approve Onboarding
                  </Btn>
                  {!showRejectInput
                    ? <Btn variant="danger" onClick={() => setShowRejectInput(true)}>
                        <XCircle size={13} /> Reject
                      </Btn>
                    : <Btn variant="danger" onClick={() => handleReview('REJECTED')} loading={isPending}>
                        Confirm Rejection
                      </Btn>
                  }
                  {showRejectInput && <Btn variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Btn>}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
