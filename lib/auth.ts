import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './config';
import type { Session, User } from '@/types';

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const s: Session = JSON.parse(raw);
    if (Date.now() > s.expires) return null;
    return s;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  const s = await getSession();
  return s?.user ?? null;
}

export async function getToken(): Promise<string | null> {
  const s = await getSession();
  return s?.access_token ?? null;
}

export function buildSession(
  access_token: string,
  refresh_token: string | undefined,
  user: User
): string {
  const session: Session = {
    access_token,
    refresh_token,
    user,
    expires: Date.now() + 8 * 60 * 60 * 1000,
  };
  return JSON.stringify(session);
}
