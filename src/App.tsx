import { useEffect, useState } from 'react';
import {
  changePassword,
  isApiMode,
  isSupabaseMode,
  isValidEmail,
  login,
  normalizeEmail,
  onPasswordRecovery,
  requestPasswordReset,
  resetPassword,
  restoreSession,
  signOut,
  type SessionUser,
} from './auth';

type View = 'login' | 'forgot' | 'reset' | 'workspace';

const errorText: Record<string, string> = {
  invalid_email: 'أدخل بريدًا إلكترونيًا صحيحًا / Enter a valid email address.',
  password_required: 'أدخل كلمة المرور / Enter your password.',
  wrong_credentials: 'البريد أو كلمة المرور غير صحيحة / Incorrect email or password.',
  server_unreachable: 'تعذّر الوصول إلى الخادم. تحقق من الاتصال وحاول مجددًا / Could not reach the server. Check the connection and try again.',
  password_too_short: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل / Password must be at least 8 characters.',
  password_needs_letter_and_digit: 'كلمة المرور يجب أن تحتوي على حروف وأرقام / Password needs both letters and numbers.',
  passwords_do_not_match: 'كلمتا المرور غير متطابقتين / The two passwords do not match.',
  reset_no_record: 'لا يوجد طلب استعادة لهذا البريد. اطلب رمزًا جديدًا / No reset request for this email. Request a new code.',
  reset_expired: 'انتهت صلاحية الرمز (30 دقيقة). اطلب رمزًا جديدًا / The code expired (30 minutes). Request a new one.',
  reset_too_many_attempts: 'محاولات كثيرة جدًا. اطلب رمزًا جديدًا / Too many attempts. Request a new code.',
  reset_mismatch: 'الرمز غير صحيح / Incorrect code.',
  reset_failed: 'فشل إعادة تعيين كلمة المرور. تحقق من الرمز وحاول مجددًا / Reset failed. Check the code and try again.',
  password_unchanged: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية / New password must be different from the current one.',
  change_failed: 'فشل تغيير كلمة المرور. حاول مجددًا / Password change failed. Try again.',
};

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const [view, setView] = useState<View>(
    params.get('mode') === 'reset' || params.get('mode') === 'recovery' ? 'reset' : 'login',
  );
  // True when the user arrived from a Supabase recovery email link.
  const [recoverySession, setRecoverySession] = useState(params.get('mode') === 'recovery');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [lampOn, setLampOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Change-password state (workspace, all roles)
  const [currentPassword, setCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeNotice, setChangeNotice] = useState<string | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);

  // Forgot-password state
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState(params.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('divemore.rememberedEmail');
      if (saved && !params.get('email')) setEmail(saved);
    } catch { /* ignore */ }
    // Supabase mode: restore an existing session on refresh, and catch
    // the recovery-link landing so the new-password form is shown.
    let cancelled = false;
    void restoreSession().then((session) => {
      if (!cancelled && session) { setUser(session); setView('workspace'); }
    });
    const unsubscribe = onPasswordRecovery(() => {
      setRecoverySession(true);
      setView('reset');
    });
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = (e: unknown) => setError(errorText[(e as Error).message] ?? (e as Error).message);

  async function onLogin(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null); setNotice(null); setBusy(true);
    try {
      const session = await login(email, password);
      try {
        if (remember) localStorage.setItem('divemore.rememberedEmail', normalizeEmail(email));
        else localStorage.removeItem('divemore.rememberedEmail');
      } catch { /* ignore */ }
      setUser(session);
      setView('workspace');
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function onForgot(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null); setNotice(null);
    if (!isValidEmail(email)) { setError(errorText.invalid_email); return; }
    setBusy(true);
    try {
      const { demoCode: generated } = await requestPasswordReset(email);
      setDemoCode(generated);
      if (isSupabaseMode()) {
        // Supabase emails a recovery link — no code to type here.
        setNotice('إذا كان الحساب موجودًا، سيصلك رابط الاستعادة بالبريد. افتح الرابط لتعيين كلمة مرور جديدة. / If the account exists, a recovery link is on its way by email. Open it to set a new password.');
        setView('login');
        return;
      }
      setNotice(
        isApiMode()
          ? 'إذا كان الحساب موجودًا، سيصلك رابط الاستعادة بالبريد. / If the account exists, a reset link is on its way by email.'
          : 'تم إنشاء رمز الاستعادة. في وضع التجربة يظهر الرمز هنا — في الإنتاج يُرسل بالبريد فقط. / Reset code created. In demo mode it is shown here — in production it is emailed only.',
      );
      setView('reset');
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function onReset(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null); setNotice(null);
    if (newPassword !== confirmPassword) { setError(errorText.passwords_do_not_match); return; }
    setBusy(true);
    try {
      await resetPassword(email, code, newPassword);
      setPassword('');
      setNewPassword(''); setConfirmPassword(''); setCode('');
      setNotice('تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة. / Password changed. Sign in with your new password.');
      setView('login');
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function onChangePassword(ev: React.FormEvent) {
    ev.preventDefault();
    if (!user) return;
    setChangeError(null); setChangeNotice(null);
    if (changeNewPassword !== changeConfirmPassword) {
      setChangeError(errorText.passwords_do_not_match);
      return;
    }
    setChangeBusy(true);
    try {
      await changePassword(user.email, currentPassword, changeNewPassword);
      setCurrentPassword(''); setChangeNewPassword(''); setChangeConfirmPassword('');
      setChangeNotice('تم تغيير كلمة المرور بنجاح. استخدمها في تسجيل الدخول القادم. / Password changed. Use it at your next sign-in.');
    } catch (e) {
      setChangeError(errorText[(e as Error).message] ?? (e as Error).message);
    } finally { setChangeBusy(false); }
  }

  if (view === 'workspace' && user) {
    return (
      <main className="workspace">
        <h1>Dive More &amp; Ohanaa — Control Center</h1>
        <p>{user.displayName} · {user.email}</p>
        <p>Role: <strong>{user.role}</strong> · Mode: <strong>{isSupabaseMode() ? 'Supabase' : isApiMode() ? 'API' : 'Demo'}</strong></p>
        <p className="muted">
          تم تسجيل الدخول بنجاح. بقية شاشات النظام غير موجودة في هذا الفرع — هذا الفرع يصلح
          تسجيل الدخول واستعادة كلمة المرور فقط (Phase 49).
          <br />Signed in. The rest of the ERP screens are not in this branch — this branch
          repairs login and forgot password only (Phase 49).
        </p>

        {/* Small Change Password section — shown for ALL roles, no role gate.
            Collapsed by default so it stays a small section in the workspace. */}
        <details className="change-password-small">
          <summary>🔑 تغيير كلمة المرور / Change password — <span className="muted">لكل الأدوار / all roles</span></summary>
          {changeNotice && <p className="notice" role="status">{changeNotice}</p>}
          {changeError && <p className="error" role="alert">{changeError}</p>}
          <form onSubmit={onChangePassword} className="change-password-form">
            <input type="password" autoComplete="current-password" required value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} dir="ltr"
              placeholder="Current password / الحالية" aria-label="Current password" />
            <input type="password" autoComplete="new-password" required value={changeNewPassword}
              onChange={(e) => setChangeNewPassword(e.target.value)} dir="ltr"
              placeholder="New password / الجديدة" aria-label="New password" />
            <input type="password" autoComplete="new-password" required value={changeConfirmPassword}
              onChange={(e) => setChangeConfirmPassword(e.target.value)} dir="ltr"
              placeholder="Confirm / تأكيد" aria-label="Confirm new password" />
            <button className="primary" type="submit" disabled={changeBusy}>
              {changeBusy ? '… / Saving' : 'حفظ / Save'}
            </button>
          </form>
        </details>

        <button type="button" onClick={() => { void signOut(); setUser(null); setView('login'); }}>
          تسجيل الخروج / Sign out
        </button>
      </main>
    );
  }

  return (
    <main className={`login-shell ${lampOn ? 'lamp-on' : 'lamp-off'}`}>
      <section className="login-scene" aria-hidden="true">
        <div className="lamp" role="presentation"><div className="lamp-glow" /><div className="lamp-head" /></div>
        <button type="button" className="lamp-toggle" aria-hidden="false"
          onClick={() => setLampOn((v) => !v)}>
          {lampOn ? 'LIGHT OFF' : 'LIGHT ON'}
        </button>
      </section>

      <section className="login-card">
        <p className="padi">PADI</p>
        <h1 className="brand">DIVE MORE <span>&amp; OHANAA</span></h1>
        <p className="muted">{isSupabaseMode() ? 'تسجيل الدخول عبر Supabase / Supabase sign-in' : isApiMode() ? 'تسجيل الدخول عبر الخادم / Server sign-in' : 'وضع التجربة / Demo sign-in'}</p>

        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="error" role="alert">{error}</p>}

        {view === 'login' && (
          <form onSubmit={onLogin}>
            <label>البريد الإلكتروني / Email
              <input type="email" autoComplete="username" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="name@divemore.com" dir="ltr" />
            </label>
            <label>كلمة المرور / Password
              <span className="password-row">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                  {showPassword ? 'إخفاء / Hide' : 'إظهار / Show'}
                </button>
              </span>
            </label>
            <label className="inline">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              تذكّر البريد / Remember email
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'جارٍ الدخول… / Signing in…' : 'تسجيل الدخول / Sign in'}
            </button>
            <button type="button" className="linklike" onClick={() => { setError(null); setView('forgot'); }}>
              نسيت كلمة المرور؟ / Forgot password?
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={onForgot}>
            <p>أدخل بريد حسابك وسنبدأ استعادة كلمة المرور. / Enter your account email to start password recovery.</p>
            <label>البريد الإلكتروني / Email
              <input type="email" autoComplete="username" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="name@divemore.com" dir="ltr" />
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'جارٍ الإرسال… / Sending…' : isSupabaseMode() ? 'إرسال رابط الاستعادة / Send recovery link' : 'إرسال رمز الاستعادة / Send reset code'}
            </button>
            <button type="button" className="linklike" onClick={() => setView('login')}>
              العودة لتسجيل الدخول / Back to sign in
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={onReset}>
            {demoCode && !isApiMode() && !isSupabaseMode() && (
              <p className="notice" role="status">
                رمز التجربة / Demo code: <strong dir="ltr">{demoCode}</strong> — صالح 30 دقيقة / valid 30 minutes.
              </p>
            )}
            {isSupabaseMode() ? (
              <p className="muted">
                {recoverySession
                  ? 'عيّن كلمة مرور جديدة لحسابك. / Set a new password for your account.'
                  : 'افتح رابط الاستعادة من بريدك أولًا، ثم عيّن كلمة المرور الجديدة هنا. / Open the recovery link from your email first, then set your new password here.'}
              </p>
            ) : (
              <>
                <label>البريد الإلكتروني / Email
                  <input type="email" autoComplete="username" required value={email}
                    onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                </label>
                <label>{isApiMode() ? 'رمز / رابط الاستعادة / Reset token' : 'رمز الاستعادة (6 أرقام) / Reset code (6 digits)'}
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={code}
                    onChange={(e) => setCode(e.target.value)} dir="ltr" />
                </label>
              </>
            )}
            <label>كلمة المرور الجديدة / New password
              <input type="password" autoComplete="new-password" required value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} dir="ltr" />
            </label>
            <label>تأكيد كلمة المرور / Confirm password
              <input type="password" autoComplete="new-password" required value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" />
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'جارٍ الحفظ… / Saving…' : 'تعيين كلمة المرور الجديدة / Set new password'}
            </button>
            <button type="button" className="linklike" onClick={() => setView('forgot')}>
              طلب رمز جديد / Request a new code
            </button>
            <button type="button" className="linklike" onClick={() => setView('login')}>
              العودة لتسجيل الدخول / Back to sign in
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
