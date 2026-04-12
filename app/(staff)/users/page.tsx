import { redirect } from 'next/navigation';
import { getToken, getUser } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const sp    = await searchParams;
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;
  if (user.role !== 'admin') redirect('/inquiries');

  const users = await usersApi.list(token, { page: sp.page ?? 1, page_size: 50 })
    .catch(() => ({ items: [], total: 0, page: 1, page_size: 50, total_pages: 1 }));

  return <UsersClient users={users} currentUser={user} />;
}
