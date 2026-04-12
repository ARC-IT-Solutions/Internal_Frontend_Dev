import { getToken, getUser } from '@/lib/auth';
import { ticketsApi } from '@/lib/api';
import { TicketsClient } from './TicketsClient';

export const dynamic = 'force-dynamic';

export default async function TicketsPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const sp    = await searchParams;
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const tickets = await ticketsApi.list(token, {
    page: sp.page ?? 1, status: sp.status, priority: sp.priority,
  }).catch(() => ({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }));

  return <TicketsClient tickets={tickets} currentUser={user} />;
}
