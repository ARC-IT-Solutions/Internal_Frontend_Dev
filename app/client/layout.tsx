import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ClientShell } from './ClientShell';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  // Staff users belong at /, not /client
  if (session.user.role !== 'client') redirect('/');
  return <ClientShell user={session.user}>{children}</ClientShell>;
}
