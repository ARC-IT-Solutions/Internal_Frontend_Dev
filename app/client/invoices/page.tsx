import { getToken, getUser } from '@/lib/auth';
import { invoicesApi, paymentsApi } from '@/lib/api';
import { ClientInvoicesClient } from './ClientInvoicesClient';

export const dynamic = 'force-dynamic';

export default async function ClientInvoicesPage() {
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const invoices = await invoicesApi.list(token, { page_size: 50 }).catch(() => ({ items: [] }));

  // Pre-load payments for all invoices
  const enriched = await Promise.all(
    invoices.items.map(async inv => {
      const payments = await paymentsApi.listByInvoice(token, inv.id).catch(() => []);
      return { ...inv, payments };
    })
  );

  return <ClientInvoicesClient invoices={enriched} currentUser={user} />;
}
