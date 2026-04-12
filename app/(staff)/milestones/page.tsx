import { getToken, getUser } from '@/lib/auth';
import { projectsApi, milestonesApi } from '@/lib/api';
import { MilestonesClient } from './MilestonesClient';

export const dynamic = 'force-dynamic';

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp    = await searchParams;
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const projectsRes = await projectsApi.list(token, { page_size: 100 }).catch(() => ({ items: [] }));
  const activeProjects = projectsRes.items.filter(p => !['CANCELLED'].includes(p.status));

  let milestones: Awaited<ReturnType<typeof milestonesApi.list>> = [];
  const focusProjectId = sp.project ?? (activeProjects[0]?.id ?? null);

  if (focusProjectId) {
    milestones = await milestonesApi.list(token, focusProjectId).catch(() => []);
  }

  return (
    <MilestonesClient
      projects={activeProjects}
      initialMilestones={milestones}
      initialProjectId={focusProjectId}
      currentUser={user}
    />
  );
}
