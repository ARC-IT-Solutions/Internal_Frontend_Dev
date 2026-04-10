/**
 * http.js
 * Central HTTP client.
 * – Injects Authorization header automatically
 * – Handles 401 → attempts token refresh → retries once → redirects to login
 * – Normalises error responses into { ok, data, error, status }
 * – All API modules import this instead of calling fetch directly
 */

import { getAccessToken, refreshAccessToken, clearSession } from './auth.js';

/**
 * Make an authenticated API request.
 * @param {string} url       - Full URL (use ENDPOINTS from config.js)
 * @param {object} options   - fetch options (method, body, headers, etc.)
 * @returns {{ ok, data, error, status }}
 */
export async function http(url, options = {}) {
  return _request(url, options, false);
}

/**
 * Multipart upload (skips Content-Type so browser sets boundary).
 */
export async function httpUpload(url, formData) {
  return _request(url, { method: 'POST', body: formData, _upload: true }, false);
}

async function _request(url, options, isRetry) {
  const token = getAccessToken();

  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!options._upload) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    return { ok: false, data: null, error: 'Network error. Check your connection.', status: 0 };
  }

  // 401 — try refresh once
  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return _request(url, options, true);
    clearSession();
    window.location.replace('login.html');
    return { ok: false, data: null, error: 'Session expired.', status: 401 };
  }

  // 204 No Content
  if (res.status === 204) return { ok: true, data: null, error: null, status: 204 };

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const error = _extractError(data, res.status);
    return { ok: false, data: null, error, status: res.status };
  }

  return { ok: true, data, error: null, status: res.status };
}

function _extractError(data, status) {
  if (!data) return `Request failed (${status}).`;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail[0]?.msg || 'Validation error.';
  if (data.errors?.length) return data.errors.map(e => e.message).join(', ');
  return `Request failed (${status}).`;
}

/**
 * Build a query string from an object, skipping null/undefined/empty values.
 * http.qs({ page: 1, status: 'OPEN', priority: null }) → 'page=1&status=OPEN'
 */
export function qs(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'all')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}
