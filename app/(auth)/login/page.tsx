// Server component — safely awaits searchParams (Next.js 15 requirement)
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg =
    params.error === 'client_role'
      ? 'Access denied. Please use the client portal.'
      : '';

  return <LoginForm initialError={errorMsg} />;
}
