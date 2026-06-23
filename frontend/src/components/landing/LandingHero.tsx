import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowLeftRight } from 'lucide-react';

const TX_LEFT = [
  { name: 'Webflow',    desc: '27485138652', amt: '-$485.25', color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
  { name: 'Automation', desc: '27485138652', amt: '-$32.50',  color: '#f87171', bg: 'rgba(239,68,68,0.15)' },
  { name: 'Relate',    desc: '27485138652', amt: '-$352.25', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
];

function TwinPhonesShowcase() {
  const [phase, setPhase]           = useState<'hidden' | 'entering' | 'done'>('hidden');
  const [rightPhase, setRightPhase] = useState<'hidden' | 'entering' | 'done'>('hidden');
  const [hoverLeft, setHoverLeft]   = useState(false);
  const [hoverRight, setHoverRight] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('entering'), 50);
    const t2 = setTimeout(() => setPhase('done'), 900);
    const t3 = setTimeout(() => setRightPhase('entering'), 200);
    const t4 = setTimeout(() => setRightPhase('done'), 1050);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const leftTx = (phase === 'done' && hoverLeft)
    ? 'translateX(-45px) translateY(-85px) scale(0.98) rotate(-8deg)'
    : phase !== 'hidden'
      ? 'translateX(-45px) translateY(-75px) scale(0.98) rotate(-8deg)'
      : 'translateX(-25px) translateY(-40px) scale(0.94) rotate(-8deg)';

  const rightTx = (rightPhase === 'done' && hoverRight)
    ? 'translateX(45px) translateY(64px) scale(1.02) rotate(-8deg)'
    : rightPhase !== 'hidden'
      ? 'translateX(45px) translateY(75px) scale(1) rotate(-8deg)'
      : 'translateX(20px) translateY(35px) scale(0.96) rotate(-8deg)';

  const spring = 'transform 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.8s cubic-bezier(0.22,1,0.36,1)';
  const snap   = 'transform 0.2s ease';

  return (
    <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[400px] lg:my-10 flex items-center justify-center select-none overflow-visible">
      <div className="absolute top-1/4 right-1/4 w-[320px] h-[320px] bg-[#7c3aed]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[260px] h-[260px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative w-full max-w-[480px] h-full flex items-center justify-center overflow-visible">

        {/* ── LEFT PHONE: Dark Dashboard ── */}
        <div
          style={{
            position: 'absolute',
            opacity: phase === 'hidden' ? 0 : 1,
            transform: leftTx,
            transition: phase === 'entering' ? spring : snap,
          }}
          onMouseEnter={() => setHoverLeft(true)}
          onMouseLeave={() => setHoverLeft(false)}
          className="bg-[#070b19] w-[210px] h-[420px] sm:w-[275px] sm:h-[550px] rounded-[42px] sm:rounded-[48px] shadow-[0_25px_60px_rgba(2,4,12,0.7)] border-[5px] sm:border-[7px] border-slate-900 overflow-hidden z-10"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[14px] bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
            <span className="w-8 h-0.5 bg-slate-800 rounded-full" />
          </div>

          <div className="h-full pt-6 px-4 pb-4 overflow-hidden text-[#e2e8f0] flex flex-col font-sans text-left bg-[#070b19]">
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black text-white tracking-tight">talented</span>
                <span className="inline-block w-2.5 h-0.5 bg-[#7c3aed] rounded-sm mt-0.5" />
              </div>
              <span className="text-slate-400 text-xs">● ●</span>
            </div>

            <h3 className="text-base font-black text-white tracking-tight leading-none mb-4">Dashboard</h3>

            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Credit Cards</p>
            <div className="relative mb-4 w-full shrink-0" style={{ height: 105 }}>
              <div className="absolute left-0 top-0 w-[84%] h-full rounded-2xl p-3 flex flex-col justify-between z-20"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-0.5">
                    <span className="text-[7px] uppercase font-mono tracking-widest text-purple-200 font-bold">talented</span>
                    <span className="inline-block w-1.5 rounded-sm" style={{ height: 3, background: '#00f3a4' }} />
                  </div>
                  <span className="text-[5.5px] text-purple-200 bg-purple-900/40 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">BUSINESS</span>
                </div>
                <p className="text-[11px] font-mono tracking-widest text-slate-50 font-bold mt-2">5412 5682 3025 2456</p>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-[8px] font-medium uppercase" style={{ color: '#c4b5fd' }}>Jessica Pierce</span>
                  <span className="text-[8px] font-semibold font-mono" style={{ color: '#c4b5fd' }}>10/28</span>
                </div>
              </div>
              <div className="absolute right-0 top-1 w-[28%] rounded-2xl p-2.5 z-10 flex flex-col justify-between opacity-80"
                style={{ height: '92%', background: 'rgba(18,22,42,0.9)', border: '1px solid #334155' }}>
                <span className="text-[5px] uppercase font-mono tracking-widest text-slate-400 font-bold">tal</span>
                <p className="text-[8px] font-mono tracking-widest text-slate-500 font-bold">3025</p>
              </div>
            </div>

            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Accounts</p>
            <div className="flex gap-2 mb-4 w-full shrink-0">
              <div className="p-3 rounded-xl w-[72%] shrink-0" style={{ background: '#131929', border: '1px solid rgba(51,65,85,0.8)' }}>
                <p className="text-[6.5px] uppercase tracking-wider text-slate-400 font-bold">private</p>
                <p className="text-[9px] font-bold text-white mt-0.5">Jessica Pierce</p>
                <p className="text-[7px] text-slate-500 font-mono">27485138652</p>
                <p className="text-[11px] font-bold font-mono mt-1" style={{ color: '#00f3a4' }}>$16,542.76</p>
              </div>
              <div className="p-3 rounded-xl w-[45%] shrink-0 opacity-60" style={{ border: '1px solid rgba(51,65,85,0.4)' }}>
                <p className="text-[6.5px] uppercase tracking-wider text-slate-500 font-bold">savings</p>
                <p className="text-[11px] font-bold text-slate-300 font-mono mt-1">$8,254.12</p>
              </div>
            </div>

            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Latest transactions</p>
            <div className="flex flex-col gap-1.5 flex-1">
              {TX_LEFT.map((tx, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-xl text-[8.5px]"
                  style={{ background: '#101424', border: '1px solid rgba(51,65,85,0.4)' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[9px] shrink-0"
                      style={{ background: tx.bg, color: tx.color }}>{tx.name[0]}</span>
                    <div>
                      <p className="font-bold text-slate-200 leading-none">{tx.name}</p>
                      <p className="text-[7px] text-slate-500 mt-0.5 font-mono">{tx.desc}</p>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-slate-200">{tx.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PHONE: Light Account Details ── */}
        <div
          style={{
            position: 'absolute',
            opacity: rightPhase === 'hidden' ? 0 : 1,
            transform: rightTx,
            transition: rightPhase === 'entering' ? spring : snap,
          }}
          onMouseEnter={() => setHoverRight(true)}
          onMouseLeave={() => setHoverRight(false)}
          className="bg-white w-[210px] h-[420px] sm:w-[275px] sm:h-[550px] rounded-[42px] sm:rounded-[48px] shadow-[0_30px_70px_rgba(2,4,12,0.45)] border-[5px] sm:border-[7px] border-slate-900 overflow-hidden z-20 pb-1"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[14px] bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
            <span className="w-8 h-0.5 bg-slate-800 rounded-full" />
          </div>

          <div className="h-full pt-6 px-4 pb-4 overflow-hidden text-slate-800 flex flex-col font-sans text-left bg-slate-50">
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black tracking-tight text-slate-900">talented</span>
                <span className="inline-block w-2.5 h-0.5 bg-[#7c3aed] rounded-sm mt-0.5" />
              </div>
              <span className="text-slate-500 text-xs">● ●</span>
            </div>

            <h3 className="text-base font-black text-slate-950 tracking-tight leading-none mb-3.5">Account details</h3>

            <div className="rounded-2xl p-3.5 text-white mb-4 shrink-0" style={{ background: '#0d1430', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[5.5px] uppercase font-mono tracking-wider bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-300">Private</span>
                  <p className="text-[9px] font-bold mt-1 text-slate-200">Jessica Pierce</p>
                  <p className="text-[6.5px] text-slate-400 font-mono mt-0.5">27485138652</p>
                </div>
                <TrendingUp style={{ width: 14, height: 14, color: '#00f3a4', flexShrink: 0 }} />
              </div>
              <div className="flex justify-between items-end mt-3">
                <span className="text-sm font-black text-white">$16,542.76</span>
                <div style={{ width: 64, height: 24 }}>
                  <svg width="100%" height="100%" viewBox="0 0 50 18" preserveAspectRatio="none">
                    <path d="M 2,13 C 8,10 14,16 20,9 C 26,3 34,5 48,2" fill="none" stroke="#00f3a4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-[7px] text-slate-400 uppercase font-black tracking-widest mb-1.5 px-0.5">
              <span>Transaction</span><span>Amount</span>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold font-mono shrink-0">W</span>
                  <div>
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none">Webflow</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-slate-800">- $485.25</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ borderRadius: '50%', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="12" fill="#fed7aa" />
                    <circle cx="9" cy="11" r="1.2" fill="#312e81" />
                    <circle cx="15" cy="11" r="1.2" fill="#312e81" />
                    <path d="M 8,14 Q 12,17 16,14" stroke="#312e81" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                  <div>
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none">Jeremy May</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-slate-800">- $32.85</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold font-mono shrink-0">R</span>
                  <p className="text-[8.5px] font-bold text-slate-900 leading-none">Relate</p>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-slate-800">- $352.25</span>
              </div>
            </div>

            <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider mb-2 mt-4">Credit cards</p>
            <div className="relative flex items-center shrink-0">
              <div className="flex gap-2 w-full overflow-hidden">
                <div className="w-1/2 py-2 px-3 rounded-xl text-white text-[8px] font-mono shrink-0" style={{ background: '#0d1430' }}>
                  <span className="text-[5px] text-slate-400 opacity-70 block">talented—</span>
                  <p className="text-[7.5px] mt-1 tracking-widest text-slate-200">5412 ****</p>
                </div>
                <div className="w-1/2 py-2 px-3 rounded-xl text-white text-[8px] font-mono shrink-0 opacity-40" style={{ background: '#1e1b4b' }}>
                  <p className="text-[7.5px] mt-1 tracking-widest">3025 ****</p>
                </div>
              </div>
              <div className="absolute right-1 w-7 h-7 bg-[#7c3aed] text-white flex items-center justify-center rounded-full border border-white/20"
                style={{ boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
                <ArrowLeftRight style={{ width: 14, height: 14 }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

interface LandingHeroProps {
  onRegister?: () => void;
  onDemoEntry?: (firstName: string, lastName: string, username: string, email: string) => void;
  showToast?: (msg: string) => void;
}

export default function LandingHero({ onRegister, onDemoEntry, showToast }: LandingHeroProps) {
  return (
    <section className="relative w-full pt-36 pb-12">
      {/* Ambient top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-[#7c3aed]/5 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-1.5 w-full relative z-10">
        <div className="w-full bg-[#080e26] rounded-3xl border border-slate-900/10 shadow-[0_32px_96px_rgba(3,6,12,0.4)] overflow-visible p-6 sm:p-12 lg:px-16 lg:py-20 relative">
          <div className="absolute top-[-100px] right-[-50px] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10 w-full">

            <div className="lg:col-span-6 flex flex-col justify-center h-full text-left">
              <h1 className="text-[34px] sm:text-[46px] lg:text-[56px] font-black tracking-tight leading-[1.1] sm:leading-[1.08] text-white font-sans">
                Generate UIs with <br />
                the Multi-Agent AI <br />
                of talented
              </h1>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center items-center relative overflow-visible mt-8 lg:mt-0">
              <div className="relative w-full overflow-visible flex items-center justify-center">
                <TwinPhonesShowcase />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
