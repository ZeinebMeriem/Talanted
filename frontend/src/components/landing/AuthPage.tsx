import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Sparkles, ArrowLeftRight, Download, Menu, Mail, Lock, ArrowRight } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

interface AuthPageProps {
  initialMode?: Mode;
  onSignIn: () => void;
  onSignInWithCredentials?: (identifier: string, password: string) => Promise<string | null>;
  onRegister?: (firstName: string, lastName: string, email: string, username: string, password: string) => Promise<string | null>;
  onBack?: () => void;
}

interface LoginForm { email: string; password: string; }
interface SignupForm { firstName: string; lastName: string; email: string; username: string; password: string; confirm: string; agreeTerms: boolean; }
interface ForgotPasswordForm { email: string; }
interface Errors { [key: string]: string | undefined; }

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .ap-root {
    min-height: 100vh; display: flex; flex-direction: column;
    background: #fff; font-family: 'Inter', sans-serif;
  }

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

  .ap-body { display: flex; flex: 1; }

  .ap-form-side {
    flex: 0 0 43%; width: 43%; min-width: 340px;
    padding: 16px 56px 12px;
    display: flex; flex-direction: column; justify-content: flex-start;
    overflow-y: auto;
  }
  @media (max-width: 1100px) { .ap-form-side { flex: 0 0 50%; width: 50%; padding: 14px 40px; } }
  @media (max-width: 880px)  { .ap-form-side { flex: 1; width: 100%; padding: 16px 24px; } }

  .ap-form-logo {
    display: flex; align-items: center; gap: 7px; margin-bottom: 36px;
    font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #111;
  }
  .ap-form-logo-dot { width: 7px; height: 7px; background: #111; border-radius: 50%; }

  .ap-title { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; color: #111; margin: 0 0 4px; }
  .ap-subtitle { font-size: 13px; color: #6b7280; margin: 0 0 14px; line-height: 1.5; }

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

  .ap-form { display: flex; flex-direction: column; gap: 8px; }
  .ap-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .ap-field { display: flex; flex-direction: column; gap: 3px; }
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

  @keyframes auth-spin { to { transform: rotate(360deg); } }
  .auth-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: auth-spin 0.7s linear infinite;
  }

  /* ── New sign-in dark inputs ── */
  .signin-input {
    width: 100%; background: #232b42;
    border: 1px solid rgba(71,85,105,0.6);
    border-radius: 2px;
    color: #fff; font-size: 14px; font-family: 'Inter', sans-serif;
    padding: 14px 16px 14px 40px;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    box-sizing: border-box;
  }
  .signin-input::placeholder { color: #64748b; }
  .signin-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124,58,237,0.1); }
  .signin-input.si-err { border-color: #f87171; }
  .si-submit-btn {
    width: 100%; background: #7c3aed; color: #fff; border: none;
    border-radius: 2px; padding: 14px; font-size: 14px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.15s; font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 14px rgba(124,58,237,0.3);
  }
  .si-submit-btn:hover:not(:disabled) { background: #6c26d8; }
  .si-submit-btn:active:not(:disabled) { background: #5b1eb8; }
  .si-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  /* ── Login: right decorative panel ── */
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

  .ap-fc {
    position: absolute; background: #fff; border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);
  }
  .ap-fc-checkout { width: 285px; top: 8%; right: 9%; padding: 22px 24px; }
  .ap-fc-mobile   { width: 225px; top: 47%; right: 7%; overflow: hidden; border-radius: 16px; }
  .ap-fc-chart    { width: 250px; bottom: 12%; left: 9%; padding: 18px 20px; position: absolute; overflow: visible !important; }

  /* ── Signup: right showcase panel ── */
  .signup-showcase {
    flex: 1;
    background: #070b15;
    display: none;
    position: relative;
    overflow: hidden;
    flex-direction: column;
    padding: 1.5rem 3rem 1rem;
    border-left: 1px solid #0f172a;
    min-height: 100%;
  }
  @media (min-width: 880px) { .signup-showcase { display: flex; } }

  .su-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px;
    background: rgba(109,40,217,0.2);
    border: 1px solid rgba(109,40,217,0.3);
    border-radius: 999px;
    font-size: 10px; font-family: monospace;
    letter-spacing: 0.08em;
    color: #c4b5fd;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 24px;
    width: fit-content;
  }

  @keyframes suPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .su-sparkle { animation: suPulse 2s ease-in-out infinite; }

  @keyframes suFadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .su-phones-wrap {
    animation: suFadeIn 0.7s ease-out 0.3s both;
    display: flex; align-items: center; justify-content: center;
    flex: 1; position: relative; padding-bottom: 20px;
    user-select: none;
  }

  @keyframes suHeadIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .su-head { animation: suHeadIn 0.6s ease-out 0.1s both; }

  .phone-left {
    width: 200px; height: 400px;
    background: #1a2138;
    border-radius: 30px;
    border: 5px solid rgba(30,41,59,0.9);
    overflow: hidden;
    flex-shrink: 0;
    z-index: 10;
    margin-right: -52px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    color: #f1f5f9;
    position: relative;
    transform: rotate(-2deg);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: default;
  }
  .phone-left:hover { transform: translateY(-6px) rotate(-1deg) scale(1.02); }

  .phone-right {
    width: 200px; height: 400px;
    background: #fff;
    border-radius: 30px;
    border: 5px solid #0f172a;
    overflow: hidden;
    flex-shrink: 0;
    z-index: 20;
    box-shadow: 0 24px 56px rgba(0,0,0,0.4);
    color: #0f172a;
    position: relative;
    transform: rotate(2deg);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: default;
  }
  .phone-right:hover { transform: translateY(-12px) rotate(1deg) scale(1.02); }

  .phone-notch {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 112px; height: 18px;
    border-radius: 0 0 16px 16px;
    z-index: 40;
    display: flex; align-items: center; justify-content: center;
  }
  .phone-inner {
    height: 100%; padding: 24px 16px 16px;
    overflow-y: auto; overflow-x: hidden;
    display: flex; flex-direction: column;
    font-family: 'Inter', sans-serif;
  }

  /* New signup form input overrides */
  .su-input {
    width: 100%; padding: 8px 12px;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    font-size: 13px; color: #0f172a;
    background: #fff; outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    font-family: 'Inter', sans-serif;
  }
  .su-input::placeholder { color: #94a3b8; }
  .su-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124,58,237,0.1); }
  .su-input.err { border-color: #f87171; background: rgba(254,242,242,0.5); box-shadow: 0 0 0 2px rgba(248,113,113,0.08); }
  .su-input-pw { padding-right: 42px; }

  .su-label {
    display: block;
    font-size: 10px; font-weight: 700;
    font-family: monospace;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 2px;
  }

  .su-submit-btn {
    width: 100%; padding: 10px; border: none; border-radius: 10px;
    font-size: 14px; font-weight: 700; cursor: pointer;
    background: #7c3aed; color: #fff;
    transition: background 0.15s, transform 0.1s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: 4px; font-family: 'Inter', sans-serif;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .su-submit-btn:hover:not(:disabled) { background: #6b21a8; }
  .su-submit-btn:active:not(:disabled) { transform: scale(0.99); }
  .su-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .su-signup-brand {
    display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
  }
  .su-signup-brand-text {
    font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #0a1027;
    font-family: 'Space Grotesk', sans-serif;
  }
  .su-signup-brand-dash {
    width: 24px; height: 4px; background: #7c3aed; border-radius: 2px;
    margin-top: 6px; display: block; flex-shrink: 0;
  }
`;

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.1-2.7-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C37.2 38.7 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"/>
  </svg>
);

function DecoPanel() {
  return (
    <div className="ap-deco-side">
      <div className="ap-fc ap-fc-checkout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['Delivery fee', '$37.99', false], ['Fees & Taxes', '$3.99', false], ['Discount', '-$2.45', true]].map(([k, v, green]) => (
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
        <div style={{ position: 'absolute', right: -36, bottom: -30, width: 88, height: 88, background: '#f0f0f0', borderRadius: 22, border: '1.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#374151', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-1px' }}>123</span>
        </div>
      </div>
    </div>
  );
}

function SignupShowcase() {
  const darkTxs = [
    { name: 'Webflow', amt: '-$485.25', desc: '27485138852', bg: 'rgba(37,99,235,0.2)', color: '#93c5fd', char: 'W' },
    { name: 'Automation', amt: '-$32.85', desc: '27485138852', bg: 'rgba(239,68,68,0.2)', color: '#fca5a5', char: 'A' },
    { name: 'Relate', amt: '-$352.25', desc: '27485138852', bg: 'rgba(16,185,129,0.2)', color: '#6ee7b7', char: 'r' },
  ];
  const lightTxs = [
    { name: 'Webflow', amt: '-$485.25', avatar: <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, flexShrink: 0 }}>W</div> },
    { name: 'Jeremy May', amt: '-$32.85', avatar: <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>👦</div> },
    { name: 'Relate', amt: '-$352.25', avatar: <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontFamily: 'monospace', flexShrink: 0 }}>r</div> },
    { name: 'Olivia Green', amt: '+$32.85', avatar: <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>👩</div> },
  ];

  return (
    <div className="signup-showcase">
      {/* Ambient blobs */}
      <div style={{ position: 'absolute', top: '25%', right: '25%', width: 384, height: 384, background: 'rgba(124,58,237,0.1)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '25%', left: '25%', width: 320, height: 320, background: 'rgba(0,243,164,0.05)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Headline */}
      <div className="su-head" style={{ position: 'relative', zIndex: 10, maxWidth: 480, marginBottom: 20 }}>
        <div className="su-badge">
          <Sparkles className="su-sparkle" style={{ width: 14, height: 14 }} />
          Multi-Agent Output Preview
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
          Generate UIs with the{' '}
          <span style={{ background: 'linear-gradient(to right, #a78bfa, #00f3a4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 800 }}>
            Multi-Agent AI
          </span>{' '}
          of Talented
        </h2>
      </div>

      {/* Phones */}
      <div className="su-phones-wrap">
        {/* Left phone — dark Dashboard */}
        <div className="phone-left">
          <div className="phone-notch" style={{ background: '#0f172a' }}>
            <span style={{ width: 40, height: 4, background: '#1e293b', borderRadius: 4, display: 'block' }} />
          </div>
          <div className="phone-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>talented featured</span>
                <span style={{ width: 10, height: 4, background: '#ec4899', borderRadius: 2, display: 'block' }} />
              </div>
              <Menu style={{ width: 14, height: 14, color: '#94a3b8' }} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 16px', lineHeight: 1 }}>Dashboard</h3>

            <p style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px' }}>Credit Cards</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 170, flexShrink: 0, borderRadius: 12, padding: 12, background: 'linear-gradient(135deg,#ec4899,#9333ea,#6366f1)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, fontFamily: 'monospace' }}>talented featured</span>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600 }}>Business</span>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.95)', marginBottom: 12, fontWeight: 600 }}>5412 5682 3025 2456</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                  <div><p style={{ fontSize: 5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 2px' }}>Holder</p><p style={{ fontWeight: 600, margin: 0 }}>Jessica Pierce</p></div>
                  <div style={{ textAlign: 'right' }}><p style={{ fontSize: 5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 2px' }}>Expires</p><p style={{ fontWeight: 600, margin: 0 }}>10/25</p></div>
                </div>
              </div>
              <div style={{ width: 40, flexShrink: 0, borderRadius: 12, padding: 8, background: '#2d3654', border: '1px solid rgba(51,65,85,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: '#cbd5e1' }}>tal</span>
                <div style={{ width: '100%', height: 6, background: 'rgba(71,85,105,0.5)', borderRadius: 2 }} />
              </div>
            </div>

            <p style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px' }}>Accounts</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 130, flexShrink: 0, borderRadius: 12, padding: 10, background: '#252c48', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 6, textTransform: 'uppercase', fontFamily: 'monospace', color: '#94a3b8', padding: '2px 4px', background: '#1a2138', borderRadius: 3, display: 'inline-block' }}>Private</span>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: '6px 0 2px', wordBreak: 'break-word' }}>Jessica Pierce</p>
                  <p style={{ fontSize: 7, color: '#64748b', margin: 0 }}>27485138852</p>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#00f3a4', margin: '8px 0 0' }}>$16,542.76</p>
              </div>
              <div style={{ flex: 1, borderRadius: 12, padding: 10, background: 'rgba(37,44,72,0.5)', border: '1px solid rgba(30,41,59,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 6, textTransform: 'uppercase', fontFamily: 'monospace', color: '#64748b', padding: '2px 4px', background: '#1a2138', borderRadius: 3, display: 'inline-block' }}>Savings</span>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '6px 0 0', lineHeight: 1.2 }}>Jessica P.</p>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: 0 }}>$8,254</p>
              </div>
            </div>

            <p style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px' }}>Latest transactions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {darkTxs.map((tx, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 12, background: 'rgba(37,44,72,0.4)', border: '1px solid rgba(30,41,59,0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: tx.bg, color: tx.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{tx.char}</div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', lineHeight: 1, margin: 0 }}>{tx.name}</p>
                      <span style={{ fontSize: 7, color: '#64748b' }}>{tx.desc}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#cbd5e1' }}>{tx.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right phone — light Account details */}
        <div className="phone-right">
          <div className="phone-notch" style={{ background: '#030712' }}>
            <span style={{ width: 40, height: 4, background: '#1e293b', borderRadius: 4, display: 'block' }} />
          </div>
          <div className="phone-inner" style={{ color: '#0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>talented featured</span>
                <span style={{ width: 10, height: 4, background: '#7c3aed', borderRadius: 2, display: 'block' }} />
              </div>
              <Menu style={{ width: 14, height: 14, color: '#64748b' }} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#020617', margin: '0 0 16px', lineHeight: 1 }}>Account details</h3>

            <div style={{ borderRadius: 16, padding: 16, background: '#141b2f', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginBottom: 20 }}>
              <span style={{ fontSize: 7, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em', color: '#94a3b8', padding: '2px 6px', background: 'rgba(30,41,59,0.8)', borderRadius: 3, display: 'inline-block' }}>Private</span>
              <p style={{ fontSize: 11, fontWeight: 700, margin: '6px 0 2px', color: '#fff' }}>Jessica Pierce</p>
              <p style={{ fontSize: 8, color: '#94a3b8', fontFamily: 'monospace', margin: '0 0 12px' }}>27485138852</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>$16,542.76</span>
                <div style={{ width: 80, height: 32 }}>
                  <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }}>
                    <path d="M 5,32 Q 25,25 45,28 T 85,12 T 95,8" fill="none" stroke="#00f3a4" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 6px' }}>Latest transactions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', fontSize: 8, fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8', paddingBottom: 4, borderBottom: '1px solid #f3f4f6', marginBottom: 8 }}>
              <span>Transaction</span><span>Amount</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {lightTxs.map((tx, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 5, borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {tx.avatar}
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', lineHeight: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.name}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'monospace', flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: tx.amt.startsWith('+') ? '#10b981' : '#1e293b' }}>{tx.amt}</span>
                    <Download style={{ width: 8, height: 8, color: '#cbd5e1' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, borderTop: '1px solid #f3f4f6', paddingTop: 12, position: 'relative' }}>
              <p style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px' }}>Credit Cards</p>
              <div style={{ width: 140, borderRadius: 8, padding: 8, background: '#121624', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 6, fontFamily: 'monospace', fontWeight: 600 }}>talented featured—</span>
                  <span style={{ fontSize: 4, textTransform: 'uppercase', color: '#94a3b8', fontFamily: 'monospace' }}>Premium</span>
                </div>
                <div style={{ fontSize: 8, fontFamily: 'monospace', letterSpacing: '0.15em', marginTop: 6 }}>5412 5682 2453</div>
              </div>
              <button style={{ position: 'absolute', bottom: -4, right: -8, width: 40, height: 40, background: '#7c3aed', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'default' }}>
                <ArrowLeftRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  if (!f.agreeTerms) e.agreeTerms = 'You must agree to continue.';
  return e;
}

function validateForgotPassword(f: ForgotPasswordForm): Errors {
  const e: Errors = {};
  if (!f.email.trim()) e.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email.';
  return e;
}

export default function AuthPage({ initialMode = 'login', onSignIn, onSignInWithCredentials, onRegister, onBack }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<SignupForm>({ firstName: '', lastName: '', email: '', username: '', password: '', confirm: '', agreeTerms: false });
  const [forgotForm, setForgotForm] = useState<ForgotPasswordForm>({ email: '' });
  const [keepMeSigned, setKeepMeSigned] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
    setShowPw(false);
    setShowConfirm(false);
    setResetSent(false);
  }

  function onLoginChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLoginForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
  }

  function onSignupChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setSignupForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
  }

  function onForgotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForgotForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let errs: Errors = {};
    
    if (mode === 'login') {
      errs = validateLogin(loginForm);
    } else if (mode === 'signup') {
      errs = validateSignup(signupForm);
    } else if (mode === 'forgot') {
      errs = validateForgotPassword(forgotForm);
    }
    
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
    } else if (mode === 'forgot') {
      setLoading(true);
      try {
        const bff = import.meta.env.VITE_BFF_BASE_URL as string || 'http://localhost:8081';
        const res = await fetch(`${bff}/api/users/public/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotForm.email }),
        });
        setLoading(false);
        if (res.ok) {
          setResetSent(true);
        } else {
          const data = await res.json().catch(() => ({})) as Record<string, string>;
          setErrors({ _global: data.error || 'Failed to send reset link. Please try again.' });
        }
      } catch (err) {
        setLoading(false);
        setErrors({ _global: 'Network error. Please try again.' });
      }
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
          {onBack && !['forgot'].includes(mode) ? (
            <button className="ap-back" onClick={onBack}>
              <ArrowLeft size={14} /> Back to home
            </button>
          ) : <span />}

          {mode === 'login' ? (
            <button className="ap-topbar-btn ap-topbar-btn-dark" onClick={() => switchMode('signup')}>Sign up</button>
          ) : mode === 'forgot' ? (
            <button className="ap-topbar-btn ap-topbar-btn-outline" onClick={() => switchMode('login')}>Back to Log In</button>
          ) : (
            <button className="ap-topbar-btn ap-topbar-btn-outline" onClick={() => switchMode('login')}>Log in</button>
          )}
        </div>

        {mode === 'login' ? (

          /* ── NEW DARK SIGN-IN (full width) ── */
          <div style={{ flex: 1, background: 'radial-gradient(ellipse at 50% 40%, #0f1528 0%, #070b19 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ width: '100%', maxWidth: 520 }}>

              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32, userSelect: 'none' }}>
                <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Talented</span>
                <span style={{ width: 28, height: 6, background: '#7c3aed', borderRadius: 2, marginTop: 14, display: 'block', flexShrink: 0 }} />
              </div>

              {/* Card */}
              <div style={{ background: '#1e2640', borderRadius: 8, border: '1px solid rgba(71,85,105,0.5)', padding: '40px 48px', boxShadow: '0 20px 50px rgba(2,4,10,0.5)' }}>
                <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 36px', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Sign In
                </h1>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>

                  {/* Global error */}
                  {errors._global && (
                    <div style={{ padding: '12px 16px', background: 'rgba(120,53,15,0.2)', border: '1px solid #92400e', color: '#fde68a', fontSize: 12, borderRadius: 2, fontWeight: 600 }}>
                      {errors._global}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.05em', marginBottom: 10 }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', pointerEvents: 'none' }}>
                        <Mail size={16} />
                      </span>
                      <input
                        className={`signin-input${errors.email ? ' si-err' : ''}`}
                        name="email" type="email" placeholder="Enter your email"
                        value={loginForm.email} onChange={onLoginChange} autoComplete="email"
                      />
                    </div>
                    {errors.email && <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.05em', marginBottom: 10 }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', pointerEvents: 'none' }}>
                        <Lock size={16} />
                      </span>
                      <input
                        className={`signin-input${errors.password ? ' si-err' : ''}`}
                        name="password" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                        value={loginForm.password} onChange={onLoginChange} autoComplete="current-password"
                        style={{ paddingRight: 42 }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>{errors.password}</p>}
                  </div>

                  {/* Keep me signed in + Forgot password */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, fontSize: 12, fontWeight: 500 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={keepMeSigned}
                        onChange={e => setKeepMeSigned(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }}
                      />
                      <span style={{ color: '#cbd5e1' }}>Keep me signed in</span>
                    </label>
                    <button type="button" onClick={() => switchMode('forgot')}
                      style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 500, transition: 'color 0.15s', padding: 0 }}>
                      Forgot Password
                    </button>
                  </div>

                  {/* Submit */}
                  <button className="si-submit-btn" type="submit" disabled={loading}>
                    {loading ? (
                      <><div className="auth-spinner" /> Signing In...</>
                    ) : (
                      <>Submit <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>
              </div>

              {/* Sign up link */}
              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                Don't have an account?{' '}
                <button onClick={() => switchMode('signup')}
                  style={{ color: '#7c3aed', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  Sign Up
                </button>
              </p>

              {/* Test user shortcut */}
              <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#475569', fontFamily: 'Inter, sans-serif' }}>
                <button onClick={() => onSignIn()}
                  style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  Sign in automatically as test user →
                </button>
              </p>
            </div>
          </div>

        ) : mode === 'forgot' ? (

          /* ── FORGOT PASSWORD: Zappy design template ── */
          <div style={{ flex: 1, background: 'radial-gradient(ellipse at 50% 40%, #0f1528 0%, #070b19 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', minHeight: '100vh' }}>
            <div style={{ width: '100%', maxWidth: 520 }}>

              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32, userSelect: 'none' }}>
                <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Talented</span>
                <span style={{ width: 28, height: 6, background: '#7c3aed', borderRadius: 2, marginTop: 14, display: 'block', flexShrink: 0 }} />
              </div>

              {/* Card */}
              <div style={{ background: '#1e2640', borderRadius: 8, border: '1px solid rgba(71,85,105,0.5)', padding: '40px 48px', boxShadow: '0 20px 50px rgba(2,4,10,0.5)', textAlign: 'center' }}>
                <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Forgot password
                </h1>
                <p style={{ fontSize: 14, color: '#cbd5e1', margin: '0 0 32px', lineHeight: 1.6 }}>
                  {resetSent ? (
                    <>Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.</>
                  ) : (
                    <>Enter your email address and we'll send you a link to reset your password.</>
                  )}
                </p>

                {!resetSent ? (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
                    {errors._global && (
                      <div style={{ padding: '12px 16px', background: 'rgba(120,53,15,0.2)', border: '1px solid #92400e', color: '#fde68a', fontSize: 12, borderRadius: 2, fontWeight: 600 }}>
                        {errors._global}
                      </div>
                    )}

                    {/* Email */}
                    <div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', pointerEvents: 'none' }}>
                          <Mail size={16} />
                        </span>
                        <input
                          className={`signin-input${errors.email ? ' si-err' : ''}`}
                          name="email" type="email" placeholder="Enter your email"
                          value={forgotForm.email} onChange={onForgotChange} autoComplete="email"
                        />
                      </div>
                      {errors.email && <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>{errors.email}</p>}
                    </div>

                    {/* Submit */}
                    <button className="si-submit-btn" type="submit" disabled={loading}>
                      {loading ? (
                        <><div className="auth-spinner" /> Sending...</>
                      ) : (
                        <>Send Me A Reset Link</>
                      )}
                    </button>
                  </form>
                ) : (
                  <div style={{ paddingTop: 12 }}>
                    <button
                      onClick={() => switchMode('login')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#7c3aed',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#6c26d8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#7c3aed')}
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </div>

              {/* Sign in link */}
              {!resetSent && (
                <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                  Remembered your password?{' '}
                  <button onClick={() => switchMode('login')}
                    style={{ color: '#7c3aed', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </div>

        ) : (

          /* ── SIGNUP: two-column layout ── */
          <div className="ap-body">
            <div className="ap-form-side">
              <div className="su-signup-brand">
                <span className="su-signup-brand-text">talented</span>
                <span className="su-signup-brand-dash" />
              </div>

              <h1 className="ap-title">Sign Up</h1>
              <p className="ap-subtitle">Create your professional profile and orchestrate dynamic interfaces.</p>

              <form className="ap-form" onSubmit={handleSubmit} noValidate>
                <div className="ap-row-2">
                  <div className="ap-field">
                    <label className="su-label">First Name</label>
                    <input
                      className={`su-input${errors.firstName ? ' err' : ''}`}
                      name="firstName" type="text" placeholder="Enter first name"
                      value={signupForm.firstName} onChange={onSignupChange} autoComplete="given-name"
                    />
                    {errors.firstName && <p className="ap-err">{errors.firstName}</p>}
                  </div>
                  <div className="ap-field">
                    <label className="su-label">Last Name</label>
                    <input
                      className={`su-input${errors.lastName ? ' err' : ''}`}
                      name="lastName" type="text" placeholder="Enter last name"
                      value={signupForm.lastName} onChange={onSignupChange} autoComplete="family-name"
                    />
                    {errors.lastName && <p className="ap-err">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="ap-field">
                  <label className="su-label">Username</label>
                  <input
                    className={`su-input${errors.username ? ' err' : ''}`}
                    name="username" type="text" placeholder="Choose username"
                    value={signupForm.username} onChange={onSignupChange} autoComplete="username"
                  />
                  {errors.username && <p className="ap-err">{errors.username}</p>}
                </div>

                <div className="ap-field">
                  <label className="su-label">Email Address</label>
                  <input
                    className={`su-input${errors.email ? ' err' : ''}`}
                    name="email" type="email" placeholder="Enter your email"
                    value={signupForm.email} onChange={onSignupChange} autoComplete="email"
                  />
                  {errors.email && <p className="ap-err">{errors.email}</p>}
                </div>

                <div className="ap-field">
                  <label className="su-label">Password</label>
                  <div className="ap-input-wrap">
                    <input
                      className={`su-input su-input-pw${errors.password ? ' err' : ''}`}
                      name="password" type={showPw ? 'text' : 'password'} placeholder="Enter password"
                      value={signupForm.password} onChange={onSignupChange} autoComplete="new-password"
                    />
                    <button type="button" className="ap-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password
                    ? <p className="ap-err">{errors.password}</p>
                    : <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>Minimum 8 characters</p>
                  }
                </div>

                <div className="ap-field">
                  <label className="su-label">Confirm Password</label>
                  <div className="ap-input-wrap">
                    <input
                      className={`su-input su-input-pw${errors.confirm ? ' err' : ''}`}
                      name="confirm" type={showConfirm ? 'text' : 'password'} placeholder="Confirm password"
                      value={signupForm.confirm} onChange={onSignupChange} autoComplete="new-password"
                    />
                    <button type="button" className="ap-pw-toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="ap-err">{errors.confirm}</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingTop: 2 }}>
                  <input
                    type="checkbox" id="agreeTerms" name="agreeTerms"
                    checked={signupForm.agreeTerms} onChange={onSignupChange}
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <label htmlFor="agreeTerms" style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, cursor: 'pointer' }}>
                    I agree to the{' '}
                    <button type="button" style={{ color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" style={{ color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>Privacy Policy</button>.
                  </label>
                </div>
                {errors.agreeTerms && <p className="ap-err">{errors.agreeTerms}</p>}

                {errors._global && (
                  <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                    {errors._global}
                  </p>
                )}

                <button className="su-submit-btn" type="submit" disabled={loading}>
                  {loading ? <><div className="auth-spinner" /> Creating account…</> : 'Create account'}
                </button>
              </form>

              <p className="ap-switch" style={{ marginTop: 10 }}>
                Already have an account?{' '}
                <button className="ap-switch-link" style={{ color: '#7c3aed' }} onClick={() => switchMode('login')}>Sign In</button>
              </p>
            </div>

            <SignupShowcase />
          </div>
        )}

      </div>
    </>
  );
}
