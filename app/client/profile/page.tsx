import { getUser } from '@/lib/auth';
import { ClientProfileClient } from './ClientProfileClient';

export const dynamic = 'force-dynamic';

export default async function ClientProfilePage() {
  const user = await getUser();
  if (!user) return null;
  return <ClientProfileClient currentUser={user} />;
}
