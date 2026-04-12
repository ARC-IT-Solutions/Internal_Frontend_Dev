import { getToken, getUser } from '@/lib/auth';
import { projectsApi, onboardingApi } from '@/lib/api';
import { ClientOnboardingClient } from './ClientOnboardingClient';

export const dynamic = 'force-dynamic';

export default async function ClientOnboardingPage() {
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  // Get client's projects that need onboarding
  const projects = await projectsApi.list(token, { page_size: 20 }).catch(() => ({ items: [] }));
  const eligible = projects.items.filter(p => ['PLANNING','ONBOARDING'].includes(p.status));

  // Load onboarding for each eligible project
  const enriched = await Promise.all(
    eligible.map(async p => {
      const onb = await onboardingApi.get(token, p.id).catch(() => null);
      return { ...p, onboarding: onb };
    })
  );

  return <ClientOnboardingClient projects={enriched} currentUser={user} />;
}
