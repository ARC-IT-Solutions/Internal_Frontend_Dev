import { getToken, getUser } from '@/lib/auth';
import { inquiriesApi, usersApi } from '@/lib/api';
import { InquiriesClient } from './InquiriesClient';
import { qs } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp     = await searchParams;
  const token  = await getToken();
  const user   = await getUser();
  if (!token || !user) return null;

  const params = qs({
    page:     sp.page ?? 1,
    status:   sp.status,
    priority: sp.priority,
  });

  const [inquiriesRes, employeesRes] = await Promise.allSettled([
    inquiriesApi.list(token, { page: sp.page ?? 1, status: sp.status, priority: sp.priority }),
    usersApi.list(token, { page_size: 100 }),
  ]);

  const inquiries = inquiriesRes.status === 'fulfilled' ? inquiriesRes.value : { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 };
  const employees = employeesRes.status === 'fulfilled' ? employeesRes.value.items.filter(u => u.role !== 'client') : [];

  return <InquiriesClient inquiries={inquiries} employees={employees} currentUser={user} />;
}
