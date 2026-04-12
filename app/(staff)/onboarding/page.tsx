import { getToken, getUser } from '@/lib/auth';
import { projectsApi, onboardingApi } from '@/lib/api';
import { OnboardingClient } from './OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp    = await searchParams;
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  // Load projects that are in PLANNING or ONBOARDING status
  const projectsRes = await projectsApi.list(token, { page_size: 100 }).catch(() => ({ items: [] }));
  const relevantProjects = projectsRes.items.filter(p =>
    ['PLANNING','ONBOARDING','IN_PROGRESS'].includes(p.status)
  );

  // If a project is pre-selected, load its onboarding
  let onboarding = null;
  const focusedProjectId = sp.project;
  if (focusedProjectId) {
    onboarding = await onboardingApi.get(token, focusedProjectId).catch(() => null);
  }

  return (
    <OnboardingClient
      projects={relevantProjects}
      initialOnboarding={onboarding}
      initialProjectId={focusedProjectId ?? null}
      currentUser={user}
    />
  );
}
