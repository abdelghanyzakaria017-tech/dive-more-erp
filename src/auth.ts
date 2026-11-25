// Dive More ERP — authentication helpers (Phase 49 + Phase 50 Supabase)
//
// Three modes, decided by env vars at build time (first match wins):
//
// 1. Supabase mode (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set):
//    real authentication through Supabase Auth. Login is
//    signInWithPassword, forgot-password emails a recovery link, reset
//    sets the new password on the recovery session, change-password
//    re-authenticates then updates. The user's role/name come from the
//    public.profiles row created by the schema trigger (see
//    supabase/schema.sql + PHASE50_SUPABASE_AUTH.md).
//
// 2. API mode (VITE_API_URL set): login / forgot-password / reset-password
//    are POSTed to the central API described in PHASE41 (bcrypt + JWT on
//    the server). This file never invents a session in that mode — a
//    non-2xx response is an error, full stop.
//
// 3. Demo mode (neither set): the documented role-preview login from
//    README / PHASE20 / PHASE22. Role is inferred from the email text.
//    A password that was set through the forgot-password flow below is
//    stored locally (SHA-256 hash, never plain text) and is then the
//    ONLY password accepted for that email. This is a local demo, not
//    production authentication — see PHASE49_LOGIN_FORGOT_PASSWORD.md.

import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export type Role =
  | 'admin'
  | 'owner'
  | 'finance'
  | 'accountant'
  | 'accounting_manager'
  | 'operations'
  | 'sales';

export interface SessionUser {
  email: string;
  role: Role;
  displayName: string;
}

const apiUrl = (): string =>
  ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

export const isApiMode = (): boolean => apiUrl().length > 0;

export const isSupabaseMode = (): boolean => isSupabaseConfigured();

// Map a Supabase Auth error onto the app's error keys (App.tsx errorText).
function supabaseErrorKey(error: { message?: string; status?: number } | null): string {
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return 'wrong_credentials';
  }
  if (msg.includes('fetch') || msg.includes('network') || error?.status === 0) {
    return 'server_unreachable';
  }
  return 'server_unreachable';
}

// Build the SessionUser for a signed-in Supabase user: role/name from the
// profiles table when present, documented email inference as fallback.
async function sessionUserFromSupabase(userId: string, email: string): Promise<SessionUser> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        const role = (data.role as Role) ?? inferRole(email);
        const name = (data.full_name as string | null)?.trim();
        return { email, role, displayName: name ? name : displayNameFor(email) };
      }
    } catch { /* profile lookup is best-effort; inference below still works */ }
  }
  return { email, role: inferRole(email), displayName: displayNameFor(email) };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(raw));
}

// Role inference, in the exact precedence documented in PHASE20/22.
// Accounting-manager spellings must be checked before "accountant",
// and "finance" before the sales default.
export function inferRole(emailRaw: string): Role {
  const email = normalizeEmail(emailRaw);
  const local = email.split('@')[0] ?? '';
  const compact = local.replace(/[^a-z]/g, '');
  if (compact.includes('accountingmanager') || compact.includes('accountsmanager') || compact.includes('accountmanager')) {
    return 'accounting_manager';
  }
  if (compact.includes('accountant') || compact.includes('bookkeeper')) return 'accountant';
  if (compact.includes('finance')) return 'finance';
  if (compact.includes('owner')) return 'owner';
  if (compact.includes('admin')) return 'admin';
  if (compact.includes('operation')) return 'operations';
  return 'sales';
}

export function displayNameFor(emailRaw: string): string {
  const local = normalizeEmail(emailRaw).split('@')[0] ?? 'user';
  const cleaned = local.replace(/[-_.]+/g, ' ').replace(/\b(sales|finance|owner|admin)\b/gi, '').trim();
  if (!cleaned) return 'Dive More User';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 8) return 'password_too_short';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'password_needs_letter_and_digit';
  return null;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const passwordKey = (email: string) => `divemore.localPassword.${normalizeEmail(email)}`;
const resetKey = 'divemore.passwordReset';

export async function getLocalPasswordHash(email: string): Promise<string | null> {
  try { return localStorage.getItem(passwordKey(email)); } catch { return null; }
}

export async function setLocalPassword(email: string, newPassword: string): Promise<void> {
  const hash = await sha256Hex(`${normalizeEmail(email)}::${newPassword}`);
  try { localStorage.setItem(passwordKey(email), hash); } catch { /* storage unavailable: demo only */ }
}

export async function checkLocalPassword(email: string, password: string): Promise<boolean> {
  const stored = await getLocalPasswordHash(email);
  if (!stored) return true; // demo mode, no reset password set yet
  const hash = await sha256Hex(`${normalizeEmail(email)}::${password}`);
  return hash === stored;
}

// --- Forgot / reset password (demo storage) ---

export interface ResetRecord {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

export const RESET_TTL_MS = 30 * 60 * 1000;
export const RESET_MAX_ATTEMPTS = 5;

export function generateResetCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

export async function createResetRecord(email: string): Promise<{ code: string; record: ResetRecord }> {
  const code = generateResetCode();
  const record: ResetRecord = {
    email: normalizeEmail(email),
    codeHash: await sha256Hex(`${normalizeEmail(email)}::${code}`),
    expiresAt: Date.now() + RESET_TTL_MS,
    attempts: 0,
  };
  try { localStorage.setItem(resetKey, JSON.stringify(record)); } catch { /* demo only */ }
  return { code, record };
}

export function loadResetRecord(): ResetRecord | null {
  try {
    const raw = localStorage.getItem(resetKey);
    return raw ? (JSON.parse(raw) as ResetRecord) : null;
  } catch { return null; }
}

export function clearResetRecord(): void {
  try { localStorage.removeItem(resetKey); } catch { /* ignore */ }
}

export async function verifyResetCode(email: string, code: string): Promise<'ok' | 'no_record' | 'expired' | 'too_many_attempts' | 'mismatch'> {
  const record = loadResetRecord();
  if (!record || record.email !== normalizeEmail(email)) return 'no_record';
  if (Date.now() > record.expiresAt) { clearResetRecord(); return 'expired'; }
  if (record.attempts >= RESET_MAX_ATTEMPTS) return 'too_many_attempts';
  const hash = await sha256Hex(`${record.email}::${code.trim()}`);
  if (hash !== record.codeHash) {
    record.attempts += 1;
    try { localStorage.setItem(resetKey, JSON.stringify(record)); } catch { /* ignore */ }
    return 'mismatch';
  }
  return 'ok';
}

// --- API calls (API mode) ---

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${apiUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function login(emailRaw: string, password: string): Promise<SessionUser> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) throw new Error('invalid_email');
  if (!password) throw new Error('password_required');

  if (isSupabaseMode()) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('server_unreachable');
    let result;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } catch {
      throw new Error('server_unreachable');
    }
    if (result.error || !result.data.user) {
      throw new Error(supabaseErrorKey(result.error));
    }
    return sessionUserFromSupabase(result.data.user.id, result.data.user.email ?? email);
  }

  if (isApiMode()) {
    const res = await postJson('/api/auth/login', { email, password });
    if (!res.ok) throw new Error(res.status === 401 ? 'wrong_credentials' : 'server_unreachable');
    const data = (await res.json()) as { user?: { email?: string; role?: Role; name?: string }; token?: string };
    if (data.token) { try { sessionStorage.setItem('divemore.token', data.token); } catch { /* ignore */ } }
    return {
      email: data.user?.email ?? email,
      role: data.user?.role ?? inferRole(email),
      displayName: data.user?.name ?? displayNameFor(email),
    };
  }

  const ok = await checkLocalPassword(email, password);
  if (!ok) throw new Error('wrong_credentials');
  // Remember the password used for this session (hash only) so Change
  // Password can verify the current password even before any reset
  // password has been set for this account.
  try {
    sessionStorage.setItem('divemore.sessionPasswordHash', await sha256Hex(`${email}::${password}`));
    sessionStorage.setItem('divemore.sessionEmail', email);
  } catch { /* ignore */ }
  return { email, role: inferRole(email), displayName: displayNameFor(email) };
}

// --- Change password (signed-in users, ALL roles) ---
//
// Available to every role — admin, owner, finance, accountant,
// accounting_manager, operations and sales — with no role gate.
// The current password must be proven before the new one is set.

export async function changePassword(emailRaw: string, currentPassword: string, newPassword: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!currentPassword) throw new Error('password_required');
  if (newPassword === currentPassword) throw new Error('password_unchanged');
  const pwError = validateNewPassword(newPassword);
  if (pwError) throw new Error(pwError);

  if (isSupabaseMode()) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('server_unreachable');
    // Prove the current password first (Supabase has no direct
    // "change with old password" call), then set the new one.
    let reauth;
    try {
      reauth = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    } catch {
      throw new Error('server_unreachable');
    }
    if (reauth.error) throw new Error(supabaseErrorKey(reauth.error));
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error('change_failed');
    return;
  }

  if (isApiMode()) {
    let token: string | null = null;
    try { token = sessionStorage.getItem('divemore.token'); } catch { /* ignore */ }
    const res = await fetch(`${apiUrl()}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, currentPassword, newPassword }),
    });
    if (!res.ok) throw new Error(res.status === 401 ? 'wrong_credentials' : 'change_failed');
    return;
  }

  // Demo mode: verify against the reset password if one was set,
  // otherwise against the password used to sign in to this session.
  const stored = await getLocalPasswordHash(email);
  const currentHash = await sha256Hex(`${email}::${currentPassword}`);
  if (stored) {
    if (currentHash !== stored) throw new Error('wrong_credentials');
  } else {
    let sessionHash: string | null = null;
    let sessionEmail: string | null = null;
    try {
      sessionHash = sessionStorage.getItem('divemore.sessionPasswordHash');
      sessionEmail = sessionStorage.getItem('divemore.sessionEmail');
    } catch { /* ignore */ }
    if (sessionEmail !== email || !sessionHash || currentHash !== sessionHash) {
      throw new Error('wrong_credentials');
    }
  }

  await setLocalPassword(email, newPassword);
  try {
    sessionStorage.setItem('divemore.sessionPasswordHash', await sha256Hex(`${email}::${newPassword}`));
  } catch { /* ignore */ }
  clearResetRecord();
}

// Always resolves in a privacy-preserving way in API mode: callers show a
// generic "if the account exists" message either way. In demo mode it
// returns the code so the flow can be completed end-to-end on this device.
export async function requestPasswordReset(emailRaw: string): Promise<{ demoCode: string | null }> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) throw new Error('invalid_email');
  if (isSupabaseMode()) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('server_unreachable');
    // Supabase emails a recovery link; clicking it returns to the app
    // with a recovery session (App.tsx shows the new-password form).
    // redirectTo must be allow-listed in Supabase Auth settings.
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/?mode=recovery`
      : undefined;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo }).catch(() => undefined);
    return { demoCode: null };
  }
  if (isApiMode()) {
    await postJson('/api/auth/forgot-password', { email }).catch(() => undefined);
    return { demoCode: null };
  }
  const { code } = await createResetRecord(email);
  return { demoCode: code };
}

export async function resetPassword(emailRaw: string, code: string, newPassword: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  const pwError = validateNewPassword(newPassword);
  if (pwError) throw new Error(pwError);

  if (isSupabaseMode()) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('server_unreachable');
    // The recovery link already created a session; `code` is unused here.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('reset_failed');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error('reset_failed');
    await supabase.auth.signOut().catch(() => undefined);
    return;
  }

  if (isApiMode()) {
    const res = await postJson('/api/auth/reset-password', { email, token: code.trim(), newPassword });
    if (!res.ok) throw new Error('reset_failed');
    return;
  }

  const verdict = await verifyResetCode(email, code);
  if (verdict !== 'ok') throw new Error(`reset_${verdict}`);
  await setLocalPassword(email, newPassword);
  clearResetRecord();
}

// --- Session helpers (all modes) ---

export async function signOut(): Promise<void> {
  if (isSupabaseMode()) {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    return;
  }
  try {
    sessionStorage.removeItem('divemore.token');
    sessionStorage.removeItem('divemore.sessionPasswordHash');
    sessionStorage.removeItem('divemore.sessionEmail');
  } catch { /* ignore */ }
}

// Restore an existing Supabase session on app load (page refresh keeps
// the user signed in). Returns null in API/demo mode — those modes keep
// the original "sign in each visit" behaviour.
export async function restoreSession(): Promise<SessionUser | null> {
  if (!isSupabaseMode()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user?.email) return null;
    return sessionUserFromSupabase(user.id, user.email);
  } catch {
    return null;
  }
}

// Fires when the user lands back on the app from a Supabase recovery
// email link. Returns an unsubscribe function. No-op outside Supabase mode.
export function onPasswordRecovery(callback: () => void): () => void {
  if (!isSupabaseMode()) return () => undefined;
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => data.subscription.unsubscribe();
}
