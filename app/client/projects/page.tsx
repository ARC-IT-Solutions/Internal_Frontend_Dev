import { getToken, getUser } from '@/lib/auth';
import { projectsApi, milestonesApi, onboardingApi } from '@/lib/api';
import { ClientProjectsClient } from './ClientProjectsClient';

export const dynamic = 'force-dynamic';

export default async function ClientProjectsPage() {
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const projects = await projectsApi.list(token, { page_size: 50 })
    .catch(() => ({ items: [] }));

  // Load milestones and onboarding for each project
  const enriched = await Promise.all(
    projects.items.map(async p => {
      const [milestones, onboarding] = await Promise.allSettled([
        milestonesApi.list(token, p.id),
        onboardingApi.get(token, p.id),
      ]);
      return {
        ...p,
        milestones: milestones.status === 'fulfilled' ? milestones.value : [],
        onboarding: onboarding.status === 'fulfilled' ? onboarding.value : null,
      };
    })
  );

  return <ClientProjectsClient projects={enriched} currentUser={user} />;
}
