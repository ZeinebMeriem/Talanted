import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle, Zap, Shield, Sparkles } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = 'login' | 'signup';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

// ─── Inline CSS injected once ────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  .auth-root {
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    display: flex;
    background: #f8fafc;
  }

  /* ── Left panel ── */
  .auth-left {
    display: none;
    flex: 1;
    position: relative;
    background: linear-gradient(135deg, #15395e 0%, #0d2540 60%, #071829 100%);
    overflow: hidden;
    padding: 48px;
    flex-direction: column;
    justify-content: space-between;
  }
  @media (min-width: 1024px) { .auth-left { display: flex; } }

  .auth-left-grid {
    position: absolute;
    inset: 0;
    background-size: 36px 36px;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
  }

  .auth-left-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.25;
  }

  .auth-brand {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    z-index: 1;
  }
  .auth-brand-dot {
    width: 8px; height: 8px;
    background: #019cda;
    border-radius: 50%;
  }

  .auth-hero {
    position: relative;
    z-index: 1;
  }
  .auth-hero-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(1,156,218,0.15);
    border: 1px solid rgba(1,156,218,0.3);
    border-radius: 999px;
    padding: 4px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #019cda;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  .auth-hero h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(28px, 3vw, 42px);
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
    margin: 0 0 16px;
  }
  .auth-hero p {
    font-size: 15px;
    color: rgba(255,255,255,0.55);
    line-height: 1.65;
    margin: 0 0 40px;
    max-width: 380px;
  }

  .auth-features {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .auth-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    color: rgba(255,255,255,0.75);
  }
  .auth-feature-icon {
    width: 32px; height: 32px;
    background: rgba(1,156,218,0.15);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #019cda;
  }

  .auth-testimonial {
    position: relative;
    z-index: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 20px 24px;
  }
  .auth-testimonial p {
    font-size: 13px;
    color: rgba(255,255,255,0.65);
    line-height: 1.6;
    margin: 0 0 12px;
    font-style: italic;
  }
  .auth-testimonial-author {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .auth-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #019cda, #15395e);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: white;
  }
  .auth-testimonial-name {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
  }
  .auth-testimonial-role {
    font-size: 11px;
    color: rgba(255,255,255,0.4);
  }

  /* ── Right panel ── */
  .auth-right {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    overflow-y: auto;
  }

  .auth-card {
    width: 100%;
    max-width: 420px;
  }

  .auth-card-header {
    margin-bottom: 32px;
  }
  .auth-card-header h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px;
  }
  .auth-card-header p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  /* ── Tab switcher ── */
  .auth-tabs {
    display: flex;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 28px;
    gap: 4px;
  }
  .auth-tab {
    flex: 1;
    padding: 9px;
    border: none;
    border-radius: 7px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    color: #64748b;
  }
  .auth-tab.active {
    background: #ffffff;
    color: #15395e;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  /* ── Form ── */
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .auth-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .auth-label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }
  .auth-input-wrap {
    position: relative;
  }
  .auth-input-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
    display: flex;
    align-items: center;
  }
  .auth-input {
    width: 100%;
    padding: 10px 40px 10px 40px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    color: #0f172a;
    background: #ffffff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
  }
  .auth-input::placeholder { color: #cbd5e1; }
  .auth-input:focus {
    border-color: #019cda;
    box-shadow: 0 0 0 3px rgba(1,156,218,0.12);
  }
  .auth-input.error {
    border-color: #f87171;
    box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
  }
  .auth-input-toggle {
    position: absolute;
    right: 13px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    padding: 0;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }
  .auth-input-toggle:hover { color: #475569; }

  .auth-error-text {
    font-size: 12px;
    color: #ef4444;
    margin: 0;
  }

  /* ── Password strength ── */
  .auth-strength {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }
  .auth-strength-bar {
    flex: 1;
    height: 3px;
    border-radius: 999px;
    background: #e2e8f0;
    transition: background 0.3s;
  }
  .auth-strength-bar.weak   { background: #f87171; }
  .auth-strength-bar.fair   { background: #fbbf24; }
  .auth-strength-bar.strong { background: #34d399; }
  .auth-strength-label {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }

  /* ── Forgot link ── */
  .auth-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -6px;
  }
  .auth-link {
    font-size: 13px;
    font-weight: 500;
    color: #019cda;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: none;
  }
  .auth-link:hover { text-decoration: underline; }

  /* ── Form-level error ── */
  .auth-form-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #ef4444;
  }

  /* ── Submit button ── */
  .auth-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    font-family: 'Space Grotesk', sans-serif;
    cursor: pointer;
    background: linear-gradient(135deg, #019cda 0%, #0178a8 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s, transform 0.15s;
    margin-top: 4px;
  }
  .auth-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .auth-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Spinner ── */
  @keyframes auth-spin { to { transform: rotate(360deg); } }
  .auth-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: auth-spin 0.7s linear infinite;
  }

  /* ── Divider ── */
  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #cbd5e1;
    font-size: 12px;
    margin: 4px 0;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }

  /* ── Social buttons ── */
  .auth-socials {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .auth-social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .auth-social-btn:hover { background: #f8fafc; border-color: #cbd5e1; }

  /* ── Success screen ── */
  .auth-success {
    text-align: center;
    padding: 24px 0;
  }
  .auth-success-icon {
    width: 64px; height: 64px;
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    color: #059669;
  }
  .auth-success h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px;
  }
  .auth-success p {
    font-size: 14px;
    color: #64748b;
    margin: 0 0 24px;
    line-height: 1.6;
  }

  /* ── Terms ── */
  .auth-terms {
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    line-height: 1.6;
    margin-top: 4px;
  }
  .auth-terms a { color: #019cda; text-decoration: none; }
  .auth-terms a:hover { text-decoration: underline; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] || 'Weak' };
}

function validate(mode: Mode, form: FormState): Errors {
  const errs: Errors = {};
  if (mode === 'signup' && !form.name.trim()) errs.name = 'Name is required.';
  if (!form.email.trim()) {
    errs.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = 'Enter a valid email address.';
  }
  if (!form.password) {
    errs.password = 'Password is required.';
  } else if (mode === 'signup' && form.password.length < 8) {
    errs.password = 'Password must be at least 8 characters.';
  }
  if (mode === 'signup') {
    if (!form.confirm) errs.confirm = 'Please confirm your password.';
    else if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
  }
  return errs;
}

// ─── Google / GitHub SVG logos ────────────────────────────────────────────────

const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.1-2.7-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C37.2 38.7 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"/>
  </svg>
);

const GitHubLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(form.password);

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
    setForm({ name: '', email: '', password: '', confirm: '' });
    setSuccess(false);
    setShowPw(false);
    setShowConfirm(false);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name as keyof Errors]) {
      setErrors(e => ({ ...e, [name]: undefined }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(mode, form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    // Simulate API call
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setSuccess(true);
  }

  const strengthColors = ['', 'weak', 'fair', 'strong', 'strong'];

  return (
    <>
      {/* Inject styles once */}
      <style>{STYLES}</style>

      <div className="auth-root">
        {/* ── Left decorative panel ── */}
        <div className="auth-left">
          <div className="auth-left-grid" />
          <div className="auth-left-blob" style={{ width: 320, height: 320, background: '#019cda', top: -80, right: -80 }} />
          <div className="auth-left-blob" style={{ width: 200, height: 200, background: '#0d6fa3', bottom: 100, left: -60 }} />

          <div className="auth-brand">
            <div className="auth-brand-dot" />
            WorkspaceHub
          </div>

          <div className="auth-hero">
            <div className="auth-hero-tag">
              <Sparkles size={11} />
              Now in public beta
            </div>
            <h2>Your focused<br />workspace awaits.</h2>
            <p>
              Streamline your workflow, track what matters, and ship faster — all in one place built for focused makers.
            </p>
            <div className="auth-features">
              {[
                { icon: <Zap size={15} />, text: 'Instant setup, no configuration needed' },
                { icon: <Shield size={15} />, text: 'Enterprise-grade security & privacy' },
                { icon: <CheckCircle size={15} />, text: 'Smart task prioritization & streaks' },
              ].map(f => (
                <div className="auth-feature" key={f.text}>
                  <div className="auth-feature-icon">{f.icon}</div>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          <div className="auth-testimonial">
            <p>"WorkspaceHub completely changed how I manage deep work sessions. My output doubled in a month."</p>
            <div className="auth-testimonial-author">
              <div className="auth-avatar">S</div>
              <div>
                <div className="auth-testimonial-name">Sofia Reyes</div>
                <div className="auth-testimonial-role">Senior Product Designer</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="auth-right">
          <div className="auth-card">
            {success ? (
              <div className="auth-success">
                <div className="auth-success-icon">
                  <CheckCircle size={32} />
                </div>
                <h3>{mode === 'login' ? 'Welcome back!' : 'Account created!'}</h3>
                <p>
                  {mode === 'login'
                    ? "You're signed in. Redirecting you to your workspace…"
                    : `We sent a confirmation to ${form.email}. Check your inbox to get started.`}
                </p>
                <button className="auth-btn" onClick={() => switchMode('login')} style={{ maxWidth: 280, margin: '0 auto' }}>
                  {mode === 'login' ? 'Go to workspace' : 'Back to sign in'}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="auth-card-header">
                  <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
                  <p>{mode === 'login' ? 'Welcome back — good to see you again.' : 'Join thousands of focused makers.'}</p>
                </div>

                {/* Tab switcher */}
                <div className="auth-tabs">
                  <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>Sign in</button>
                  <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign up</button>
                </div>

                {/* Social buttons */}
                <div className="auth-socials" style={{ marginBottom: 20 }}>
                  <button className="auth-social-btn" type="button"><GoogleLogo /> Google</button>
                  <button className="auth-social-btn" type="button"><GitHubLogo /> GitHub</button>
                </div>

                <div className="auth-divider">or continue with email</div>

                <form className="auth-form" onSubmit={onSubmit} style={{ marginTop: 16 }} noValidate>
                  {/* Name (signup only) */}
                  {mode === 'signup' && (
                    <div className="auth-field">
                      <label className="auth-label">Full name</label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon"><User size={15} /></span>
                        <input
                          className={`auth-input${errors.name ? ' error' : ''}`}
                          name="name"
                          type="text"
                          placeholder="Ada Lovelace"
                          value={form.name}
                          onChange={onChange}
                          autoComplete="name"
                        />
                      </div>
                      {errors.name && <p className="auth-error-text">{errors.name}</p>}
                    </div>
                  )}

                  {/* Email */}
                  <div className="auth-field">
                    <label className="auth-label">Email address</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon"><Mail size={15} /></span>
                      <input
                        className={`auth-input${errors.email ? ' error' : ''}`}
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={onChange}
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <p className="auth-error-text">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="auth-field">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon"><Lock size={15} /></span>
                      <input
                        className={`auth-input${errors.password ? ' error' : ''}`}
                        name="password"
                        type={showPw ? 'text' : 'password'}
                        placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                        value={form.password}
                        onChange={onChange}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button type="button" className="auth-input-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="auth-error-text">{errors.password}</p>}
                    {mode === 'signup' && form.password && (
                      <>
                        <div className="auth-strength">
                          {[1, 2, 3, 4].map(i => (
                            <div
                              key={i}
                              className={`auth-strength-bar ${i <= strength.score ? strengthColors[strength.score] : ''}`}
                            />
                          ))}
                        </div>
                        <div className="auth-strength-label">{strength.label}</div>
                      </>
                    )}
                  </div>

                  {/* Confirm password (signup only) */}
                  {mode === 'signup' && (
                    <div className="auth-field">
                      <label className="auth-label">Confirm password</label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon"><Lock size={15} /></span>
                        <input
                          className={`auth-input${errors.confirm ? ' error' : ''}`}
                          name="confirm"
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={form.confirm}
                          onChange={onChange}
                          autoComplete="new-password"
                        />
                        <button type="button" className="auth-input-toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {errors.confirm && <p className="auth-error-text">{errors.confirm}</p>}
                    </div>
                  )}

                  {/* Forgot password (login only) */}
                  {mode === 'login' && (
                    <div className="auth-row">
                      <button type="button" className="auth-link">Forgot password?</button>
                    </div>
                  )}

                  {/* Form-level error */}
                  {errors.form && <div className="auth-form-error">{errors.form}</div>}

                  {/* Submit */}
                  <button className="auth-btn" type="submit" disabled={loading}>
                    {loading
                      ? <><div className="auth-spinner" />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                      : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></>
                    }
                  </button>

                  {/* Terms (signup) */}
                  {mode === 'signup' && (
                    <p className="auth-terms">
                      By creating an account you agree to our{' '}
                      <a href="#">Terms of Service</a> and{' '}
                      <a href="#">Privacy Policy</a>.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
