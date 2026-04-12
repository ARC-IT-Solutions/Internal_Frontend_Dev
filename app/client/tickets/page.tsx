import { getToken, getUser } from '@/lib/auth';
import { ticketsApi, projectsApi } from '@/lib/api';
import { ClientTicketsClient } from './ClientTicketsClient';

export const dynamic = 'force-dynamic';

export default async function ClientTicketsPage() {
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const [ticketsRes, projectsRes] = await Promise.allSettled([
    ticketsApi.list(token, { page_size: 50 }),
    projectsApi.list(token, { page_size: 20 }),
  ]);

  const tickets  = ticketsRes.status  === 'fulfilled' ? ticketsRes.value.items  : [];
  const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.items : [];

  return <ClientTicketsClient tickets={tickets} projects={projects} currentUser={user} />;
}
