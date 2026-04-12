import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/config';
import type { Session } from '@/types';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static / system paths — always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/api/proxy' ||
    pathname.startsWith('/api/proxy')
  ) {
    return NextResponse.next();
  }

  // 2. Login page
  if (pathname === '/login') {
    const raw = request.cookies.get(SESSION_COOKIE)?.value;
    if (raw) {
      try {
        const s: Session = JSON.parse(raw);
        if (Date.now() < s.expires) {
          // Already logged in — send to correct home
          return NextResponse.redirect(
            new URL(s.user.role === 'client' ? '/client' : '/', request.url)
          );
        }
      } catch {}
    }
    return NextResponse.next();
  }

  // 3. All other routes — require valid session
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let session: Session;
  try {
    session = JSON.parse(raw);
    if (Date.now() > session.expires) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const role = session.user.role;

  // 4. Client-role users: can only access /client/* paths
  if (role === 'client' && !pathname.startsWith('/client')) {
    return NextResponse.redirect(new URL('/client', request.url));
  }

  // 5. Staff (employee/admin): cannot access /client/* paths
  if (role !== 'client' && pathname.startsWith('/client')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except _next internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
