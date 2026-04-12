import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Shell } from '@/components/layout/Shell';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  // Client-role users belong in /client, not here
  if (session.user.role === 'client') redirect('/client');
  return <Shell user={session.user}>{children}</Shell>;
}
