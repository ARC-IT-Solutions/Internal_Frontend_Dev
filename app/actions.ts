'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '@/lib/config';
import { buildSession, getToken, getSession } from '@/lib/auth';
import {
  authApi, usersApi, inquiriesApi, projectsApi, onboardingApi,
  milestonesApi, ticketsApi, invoicesApi, paymentsApi,
  ApiError,
} from '@/lib/api';
import type { ConvertInquiryPayload, RecordPaymentPayload } from '@/types';

type AR<T = unknown> = Promise<{ ok: true; data: T } | { ok: false; error: string }>;

function ok<T>(data: T) { return { ok: true as const, data }; }
function fail(e: unknown) {
  const msg = e instanceof ApiError ? e.message : String(e);
  return { ok: false as const, error: msg };
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export async function loginAction(email: string, password: string): AR<{ role: string }> {
  try {
    const tokens = await authApi.login(email, password);
    const user   = await authApi.me(tokens.access_token);
    const store  = await cookies();
    store.set(SESSION_COOKIE, buildSession(tokens.access_token, tokens.refresh_token, user), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   8 * 60 * 60,
      path:     '/',
    });
    return ok({ role: user.role });
  } catch (e) { return fail(e); }
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function changePasswordAction(current: string, next: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await authApi.changePassword(token, current, next);
    return ok(null);
  } catch (e) { return fail(e); }
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function registerUserAction(payload: {
  email: string; password: string; full_name: string; phone?: string; role: string;
}): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    const user = await authApi.register(token, payload);
    return ok(user);
  } catch (e) { return fail(e); }
}

export async function updateUserAction(id: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await usersApi.update(token, id, payload as never));
  } catch (e) { return fail(e); }
}

export async function updateMeAction(payload: { full_name?: string; phone?: string }): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await usersApi.updateMe(token, payload));
  } catch (e) { return fail(e); }
}

// ─── INQUIRIES ────────────────────────────────────────────────────────────────
export async function patchInquiryAction(id: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await inquiriesApi.patch(token, id, payload as never));
  } catch (e) { return fail(e); }
}

export async function deleteInquiryAction(id: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await inquiriesApi.delete(token, id);
    return ok(null);
  } catch (e) { return fail(e); }
}

export async function convertInquiryAction(id: string, payload: ConvertInquiryPayload): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await inquiriesApi.convert(token, id, payload));
  } catch (e) { return fail(e); }
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
export async function createProjectAction(payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await projectsApi.create(token, payload as never));
  } catch (e) { return fail(e); }
}

export async function patchProjectAction(id: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await projectsApi.patch(token, id, payload as never));
  } catch (e) { return fail(e); }
}

export async function deleteProjectAction(id: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await projectsApi.delete(token, id);
    return ok(null);
  } catch (e) { return fail(e); }
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
export async function submitOnboardingAction(projectId: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await onboardingApi.submit(token, projectId, payload as never));
  } catch (e) { return fail(e); }
}

export async function reviewOnboardingAction(
  projectId: string, status: 'APPROVED' | 'REJECTED', rejection_reason?: string
): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await onboardingApi.review(token, projectId, { status, rejection_reason }));
  } catch (e) { return fail(e); }
}

// ─── MILESTONES ───────────────────────────────────────────────────────────────
export async function createMilestoneAction(projectId: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await milestonesApi.create(token, projectId, payload as never));
  } catch (e) { return fail(e); }
}

export async function updateMilestoneAction(projectId: string, msId: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await milestonesApi.update(token, projectId, msId, payload as never));
  } catch (e) { return fail(e); }
}

export async function activateMilestoneAction(projectId: string, msId: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await milestonesApi.activate(token, projectId, msId));
  } catch (e) { return fail(e); }
}

export async function deleteMilestoneAction(projectId: string, msId: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await milestonesApi.delete(token, projectId, msId);
    return ok(null);
  } catch (e) { return fail(e); }
}

// ─── TICKETS ──────────────────────────────────────────────────────────────────
export async function createTicketAction(payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await ticketsApi.create(token, payload as never));
  } catch (e) { return fail(e); }
}

export async function patchTicketAction(id: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await ticketsApi.patch(token, id, payload as never));
  } catch (e) { return fail(e); }
}

export async function addCommentAction(ticketId: string, message: string, is_internal: boolean): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await ticketsApi.addComment(token, ticketId, message, is_internal));
  } catch (e) { return fail(e); }
}

export async function deleteTicketAction(id: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await ticketsApi.delete(token, id);
    return ok(null);
  } catch (e) { return fail(e); }
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
export async function createInvoiceAction(payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await invoicesApi.create(token, payload as never));
  } catch (e) { return fail(e); }
}

export async function patchInvoiceAction(id: string, payload: Record<string, unknown>): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await invoicesApi.patch(token, id, payload as never));
  } catch (e) { return fail(e); }
}

export async function deleteInvoiceAction(id: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await invoicesApi.delete(token, id);
    return ok(null);
  } catch (e) { return fail(e); }
}

export async function getInvoiceDownloadAction(id: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await invoicesApi.getDownloadLink(token, id));
  } catch (e) { return fail(e); }
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export async function recordPaymentAction(payload: RecordPaymentPayload): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    return ok(await paymentsApi.record(token, payload));
  } catch (e) { return fail(e); }
}

export async function deletePaymentAction(paymentId: string): AR {
  try {
    const token = await getToken(); if (!token) return fail('Not authenticated');
    await paymentsApi.delete(token, paymentId);
    return ok(null);
  } catch (e) { return fail(e); }
}
