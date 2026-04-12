import { getToken, getUser } from '@/lib/auth';
import { invoicesApi, paymentsApi } from '@/lib/api';
import { InvoicesClient } from './InvoicesClient';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp    = await searchParams;
  const token = await getToken();
  const user  = await getUser();
  if (!token || !user) return null;

  const invoicesRes = await invoicesApi.list(token, {
    page: sp.page ?? 1, status: sp.status,
  }).catch(() => ({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }));

  // Pre-load payments for focused invoice
  let initialPayments: Awaited<ReturnType<typeof paymentsApi.listByInvoice>> = [];
  if (sp.invoice) {
    initialPayments = await paymentsApi.listByInvoice(token, sp.invoice).catch(() => []);
  }

  return (
    <InvoicesClient
      invoices={invoicesRes}
      currentUser={user}
      initialFocusId={sp.invoice ?? null}
      initialPayments={initialPayments}
    />
  );
}
