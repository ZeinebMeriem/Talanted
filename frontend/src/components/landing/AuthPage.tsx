import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'signup';

interface AuthPageProps {
  initialMode?: Mode;
  onSignIn: () => void;
  onSignInWithCredentials?: (identifier: string, password: string) => Promise<string | null>;
  onRegister?: (firstName: string, lastName: string, email: string, username: string, password: string) => Promise<string | null>;
  onBack?: () => void;
}

interface LoginForm { email: string; password: string; }
interface SignupForm { firstName: string; lastName: string; email: string; username: string; password: string; confirm: string; }
interface Errors { [key: string]: string | undefined; }

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .ap-root {
    min-height: 100vh; display: flex; flex-direction: column;
    background: #fff; font-family: 'Inter', sans-serif;
  }

  /* ── Top navigation bar ── */
  .ap-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 36px; border-bottom: 1px solid #e5e7eb;
    background: #fff; position: sticky; top: 0; z-index: 20;
  }
  .ap-back {
    display: inline-flex; align-items: center; gap: 7px;
    color: #374151; font-size: 13px; font-weight: 500;
    background: none; border: none; cursor: pointer; padding: 0;
    font-family: 'Inter', sans-serif; transition: color 0.15s;
  }
  .ap-back:hover { color: #111; }

  .ap-topbar-btn {
    padding: 7px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
  }
  .ap-topbar-btn-outline { background: #fff; border: 1.5px solid #d1d5db; color: #111; }
  .ap-topbar-btn-outline:hover { border-color: #9ca3af; }
  .ap-topbar-btn-dark { background: #111827; border: 1.5px solid #111827; color: #fff; }
  .ap-topbar-btn-dark:hover { background: #1f2937; }

  /* ── Body ── */
  .ap-body { display: flex; flex: 1; }

  /* ── Left form panel ── */
  .ap-form-side {
    flex: 0 0 43%; width: 43%; min-width: 340px;
    padding: 44px 60px 48px;
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  @media (max-width: 1100px) { .ap-form-side { flex: 0 0 50%; width: 50%; padding: 40px 44px; } }
  @media (max-width: 880px)  { .ap-form-side { flex: 1; width: 100%; padding: 32px 28px; } }

  /* Logo inside form */
  .ap-form-logo {
    display: flex; align-items: center; gap: 7px; margin-bottom: 36px;
    font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #111;
  }
  .ap-form-logo-dot { width: 7px; height: 7px; background: #111; border-radius: 50%; }

  .ap-title { font-family: 'Space Grotesk', sans-serif; font-size: 30px; font-weight: 700; color: #111; margin: 0 0 8px; }
  .ap-subtitle { font-size: 14px; color: #6b7280; margin: 0 0 28px; line-height: 1.6; }

  /* Google btn */
  .ap-google-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; padding: 11px 16px; border: 1.5px solid #e5e7eb; border-radius: 10px;
    background: #fff; font-size: 14px; font-weight: 500; color: #374151;
    cursor: pointer; transition: background 0.15s, border-color 0.15s; margin-bottom: 20px;
    font-family: 'Inter', sans-serif;
  }
  .ap-google-btn:hover { background: #f9fafb; border-color: #d1d5db; }

  .ap-or {
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    font-size: 12px; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .ap-or::before, .ap-or::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

  .ap-form { display: flex; flex-direction: column; gap: 16px; }
  .ap-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .ap-field { display: flex; flex-direction: column; gap: 6px; }
  .ap-label { font-size: 13px; font-weight: 600; color: #374151; }
  .ap-label-row { display: flex; justify-content: space-between; align-items: center; }

  .ap-input {
    width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 9px;
    font-size: 14px; color: #111; background: #fff; outline: none;
    transition: border-color 0.18s, box-shadow 0.18s; font-family: 'Inter', sans-serif;
  }
  .ap-input::placeholder { color: #d1d5db; }
  .ap-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .ap-input.err { border-color: #f87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.08); }
  .ap-input-pw { padding-right: 42px; }
  .ap-input-wrap { position: relative; }
  .ap-pw-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #9ca3af;
    padding: 0; display: flex; transition: color 0.15s;
  }
  .ap-pw-toggle:hover { color: #374151; }

  .ap-reset-link {
    font-size: 13px; font-weight: 500; color: #2563eb;
    background: none; border: none; cursor: pointer; padding: 0;
    font-family: 'Inter', sans-serif;
  }
  .ap-reset-link:hover { text-decoration: underline; }

  .ap-err { font-size: 12px; color: #ef4444; margin: 0; }

  .ap-submit-btn {
    width: 100%; padding: 12px; border: none; border-radius: 10px;
    font-size: 15px; font-weight: 600; cursor: pointer;
    background: #2563eb; color: #fff;
    transition: background 0.15s, transform 0.1s;
    font-family: 'Space Grotesk', sans-serif; margin-top: 4px;
  }
  .ap-submit-btn:hover { background: #1d4ed8; }
  .ap-submit-btn:active { transform: scale(0.99); }

  .ap-switch { font-size: 13px; color: #6b7280; text-align: center; margin-top: 18px; }
  .ap-switch-link {
    color: #2563eb; font-weight: 700; background: none; border: none;
    cursor: pointer; padding: 0; font-family: 'Inter', sans-serif;
  }
  .ap-switch-link:hover { text-decoration: underline; }

  .ap-terms { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 14px; line-height: 1.6; }
  .ap-terms a { color: #2563eb; text-decoration: none; }
  .ap-terms a:hover { text-decoration: underline; }

  .ap-test-link {
    font-size: 13px; color: #2563eb; text-align: center; margin-top: 22px;
    background: none; border: none; cursor: pointer; padding: 0;
    font-family: 'Inter', sans-serif;
  }
  .ap-test-link:hover { text-decoration: underline; }

  /* ── Right decorative panel ── */
  .ap-deco-side {
    flex: 1; position: relative;
    background-image:
      linear-gradient(to right, rgba(0,0,0,0.055) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.055) 1px, transparent 1px);
    background-size: 44px 44px;
    background-color: #f8f9fa;
    display: none;
    overflow: visible;
  }
  @media (min-width: 880px) { .ap-deco-side { display: block; } }

  /* Cards */
  .ap-fc {
    position: absolute; background: #fff; border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);
  }
  .ap-fc-checkout { width: 285px; top: 8%; right: 9%; padding: 22px 24px; }
  .ap-fc-mobile   { width: 225px; top: 47%; right: 7%; overflow: hidden; border-radius: 16px; }
  .ap-fc-chart    { width: 250px; bottom: 12%; left: 9%; padding: 18px 20px; position: absolute; overflow: visible !important; }
`;

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.1-2.7-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C37.2 38.7 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"/>
  </svg>
);

function validateLogin(f: LoginForm): Errors {
  const e: Errors = {};
  if (!f.email.trim()) e.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email.';
  if (!f.password) e.password = 'Password is required.';
  return e;
}

function validateSignup(f: SignupForm): Errors {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = 'Required.';
  if (!f.lastName.trim()) e.lastName = 'Required.';
  if (!f.email.trim()) e.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email.';
  if (!f.username.trim()) e.username = 'Username is required.';
  if (!f.password) e.password = 'Password is required.';
  else if (f.password.length < 8) e.password = 'Min. 8 characters.';
  if (!f.confirm) e.confirm = 'Required.';
  else if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
  return e;
}

/* ── Decorative right panel ── */
function DecoPanel() {
  return (
    <div className="ap-deco-side">

      {/* Checkout card */}
      <div className="ap-fc ap-fc-checkout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['Delivery fee', '$37.99', false], ['Fees & Taxes', '$3.99', false], ['Discount', '-$2.45', true]] .map(([k, v, green]) => (
            <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: green ? '#10b981' : '#374151' }}>
              <span style={{ fontWeight: green ? 600 : 400 }}>{String(k)}</span>
              <span style={{ fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#111' }}>
            <span>Subtotal</span><span>$34.97</span>
          </div>
          <button style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif' }}>
            Continue
          </button>
        </div>
      </div>

      {/* Mobile app card */}
      <div className="ap-fc ap-fc-mobile">
        <div style={{ background: '#111', color: '#fff', padding: '9px 15px', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="10" viewBox="0 0 14 10"><rect x="0" y="3" width="2" height="7" rx="1" fill="white" opacity="0.4"/><rect x="3" y="2" width="2" height="8" rx="1" fill="white" opacity="0.6"/><rect x="6" y="0" width="2" height="10" rx="1" fill="white"/><rect x="9.5" y="1" width="4" height="8" rx="1.5" fill="none" stroke="white" strokeWidth="1.2"/><rect x="10" y="3" width="2.5" height="4" rx="0.8" fill="white"/></svg>
          </div>
        </div>
        <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#111' }}>
            <span style={{ color: '#ef4444', fontSize: 11 }}>📍</span> Park Way 145
          </div>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['🐾 Dry food', '🐱 Vet food', '🥗 Fresh'].map(t => (
              <span key={t} style={{ fontSize: 10, background: '#f3f4f6', borderRadius: 999, padding: '3px 7px', fontWeight: 500, color: '#374151' }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Fastest</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐶</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>Zaza & Zainab Pack</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>La Palma Vet Center</div>
              </div>
            </div>
            <button style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Go</button>
          </div>
        </div>
      </div>

      {/* Monthly chart card with 123 badge overlapping */}
      <div className="ap-fc ap-fc-chart">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Monthly</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
          {[22, 38, 30, 48, 34, 56, 42, 76].map((h, i) => (
            <div key={i} style={{ flex: 1, background: i === 7 ? '#22c55e' : '#e5e7eb', borderRadius: '3px 3px 2px 2px', height: `${h}%` }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: '#9ca3af' }}>MAR</span>
          <span style={{ color: '#22c55e', fontWeight: 700 }}>APR</span>
        </div>
        {/* 123 badge overlapping bottom-right of chart card */}
        <div style={{
          position: 'absolute', right: -36, bottom: -30,
          width: 88, height: 88,
          background: '#f0f0f0',
          borderRadius: 22,
          border: '1.5px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#374151', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-1px' }}>123</span>
        </div>
      </div>

    </div>
  );
}

/* ── Main component ── */
export default function AuthPage({ initialMode = 'login', onSignIn, onSignInWithCredentials, onRegister, onBack }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<SignupForm>({ firstName: '', lastName: '', email: '', username: '', password: '', confirm: '' });

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
    setShowPw(false);
    setShowConfirm(false);
  }

  function onLoginChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLoginForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
  }

  function onSignupChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setSignupForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = mode === 'login' ? validateLogin(loginForm) : validateSignup(signupForm);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (mode === 'login' && onSignInWithCredentials) {
      setLoading(true);
      const err = await onSignInWithCredentials(loginForm.email, loginForm.password);
      setLoading(false);
      if (err) { setErrors({ _global: err }); return; }
    } else if (mode === 'signup' && onRegister) {
      setLoading(true);
      const err = await onRegister(signupForm.firstName, signupForm.lastName, signupForm.email, signupForm.username, signupForm.password);
      setLoading(false);
      if (err) { setErrors({ _global: err }); return; }
    } else {
      onSignIn();
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="ap-root">

        {/* Top navigation bar */}
        <div className="ap-topbar">
          {onBack ? (
            <button className="ap-back" onClick={onBack}>
              <ArrowLeft size={14} /> Back to home
            </button>
          ) : <span />}

          {mode === 'login' ? (
            <button className="ap-topbar-btn ap-topbar-btn-dark" onClick={() => switchMode('signup')}>Sign up</button>
          ) : (
            <button className="ap-topbar-btn ap-topbar-btn-outline" onClick={() => switchMode('login')}>Log in</button>
          )}
        </div>

        {/* Body */}
        <div className="ap-body">

          {/* Form panel */}
          <div className="ap-form-side">

            {/* Logo */}
            <div className="ap-form-logo">
              <span className="ap-form-logo-dot" />
              talanted
            </div>

            {mode === 'login' ? (
              <>
                <h1 className="ap-title">Welcome back</h1>
                <p className="ap-subtitle">Access your design projects and team AI-pipelines inside your talanted workspace instantly.</p>

                <button className="ap-google-btn" type="button" onClick={() => onSignIn()}>
                  <GoogleLogo /> Continue with Google
                </button>

                <div className="ap-or">or</div>

                <form className="ap-form" onSubmit={handleSubmit} noValidate>
                  <div className="ap-field">
                    <label className="ap-label">Email address</label>
                    <input
                      className={`ap-input${errors.email ? ' err' : ''}`}
                      name="email" type="email" placeholder="you@example.com"
                      value={loginForm.email} onChange={onLoginChange} autoComplete="email"
                    />
                    {errors.email && <p className="ap-err">{errors.email}</p>}
                  </div>

                  <div className="ap-field">
                    <div className="ap-label-row">
                      <label className="ap-label">Password</label>
                      <button type="button" className="ap-reset-link" onClick={() => onSignIn()}>Reset password?</button>
                    </div>
                    <div className="ap-input-wrap">
                      <input
                        className={`ap-input ap-input-pw${errors.password ? ' err' : ''}`}
                        name="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                        value={loginForm.password} onChange={onLoginChange} autoComplete="current-password"
                      />
                      <button type="button" className="ap-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="ap-err">{errors.password}</p>}
                  </div>

                  {errors._global && (
                    <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                      {errors._global}
                    </p>
                  )}
                  <button className="ap-submit-btn" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Signing in…' : 'Log In'}
                  </button>
                </form>

                <p className="ap-switch">
                  First time using talanted?{' '}
                  <button className="ap-switch-link" onClick={() => switchMode('signup')}>Sign Up</button>
                </p>

                <p className="ap-terms">
                  By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </p>

                <button className="ap-test-link" type="button" onClick={() => onSignIn()}>
                  Sign in automatically as test user →
                </button>
              </>
            ) : (
              <>
                <h1 className="ap-title">Join Talanted</h1>
                <p className="ap-subtitle">Create your account and start generating UIs instantly.</p>

                <form className="ap-form" onSubmit={handleSubmit} noValidate>
                  <div className="ap-row-2">
                    <div className="ap-field">
                      <label className="ap-label">First name</label>
                      <input
                        className={`ap-input${errors.firstName ? ' err' : ''}`}
                        name="firstName" type="text" placeholder="Meriem"
                        value={signupForm.firstName} onChange={onSignupChange} autoComplete="given-name"
                      />
                      {errors.firstName && <p className="ap-err">{errors.firstName}</p>}
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Last name</label>
                      <input
                        className={`ap-input${errors.lastName ? ' err' : ''}`}
                        name="lastName" type="text" placeholder="Boukraa"
                        value={signupForm.lastName} onChange={onSignupChange} autoComplete="family-name"
                      />
                      {errors.lastName && <p className="ap-err">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Email</label>
                    <input
                      className={`ap-input${errors.email ? ' err' : ''}`}
                      name="email" type="email" placeholder="you@example.com"
                      value={signupForm.email} onChange={onSignupChange} autoComplete="email"
                    />
                    {errors.email && <p className="ap-err">{errors.email}</p>}
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Username</label>
                    <input
                      className={`ap-input${errors.username ? ' err' : ''}`}
                      name="username" type="text" placeholder="your_username"
                      value={signupForm.username} onChange={onSignupChange} autoComplete="username"
                    />
                    {errors.username && <p className="ap-err">{errors.username}</p>}
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Password</label>
                    <div className="ap-input-wrap">
                      <input
                        className={`ap-input ap-input-pw${errors.password ? ' err' : ''}`}
                        name="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                        value={signupForm.password} onChange={onSignupChange} autoComplete="new-password"
                      />
                      <button type="button" className="ap-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="ap-err">{errors.password}</p>}
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Confirm password</label>
                    <div className="ap-input-wrap">
                      <input
                        className={`ap-input ap-input-pw${errors.confirm ? ' err' : ''}`}
                        name="confirm" type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                        value={signupForm.confirm} onChange={onSignupChange} autoComplete="new-password"
                      />
                      <button type="button" className="ap-pw-toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.confirm && <p className="ap-err">{errors.confirm}</p>}
                  </div>

                  {errors._global && (
                    <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                      {errors._global}
                    </p>
                  )}
                  <button className="ap-submit-btn" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Creating account…' : 'Join Talanted'}
                  </button>
                </form>

                <p className="ap-switch">
                  Already have an account?{' '}
                  <button className="ap-switch-link" onClick={() => switchMode('login')}>Log In</button>
                </p>

                <p className="ap-terms">
                  By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </p>
              </>
            )}
          </div>

          {/* Decorative right panel */}
          <DecoPanel />

        </div>
      </div>
    </>
  );
}
