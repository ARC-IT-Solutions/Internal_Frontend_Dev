/**
 * app/api/proxy/route.ts
 * Generic proxy for client-side fetches that need auth.
 * Client components call /api/proxy?path=tickets/ID/comments
 * This reads the httpOnly cookie and forwards to the real backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, EP, API_BASE } from '@/lib/config';
import type { Session } from '@/types';

function getToken(): string | null {
  return null; // will be called inside handler
}

export async function GET(request: NextRequest) {
  const store = await cookies();
  const raw   = store.get(SESSION_COOKIE)?.value;
  if (!raw) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let session: Session;
  try { session = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }); }
  if (Date.now() > session.expires) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  try {
    const apiUrl = `${API_BASE}/${path}`;
    const res = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const store = await cookies();
  const raw   = store.get(SESSION_COOKIE)?.value;
  if (!raw) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let session: Session;
  try { session = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  try {
    const apiUrl = `${API_BASE}/${path}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }
}
