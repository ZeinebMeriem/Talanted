import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

interface SystemFeaturesProps {
  showToast: (msg: string) => void;
}

const TABS = [
  {
    id: 'collab',
    label: 'Collaboration',
    heading: 'Better, faster collaboration',
    description:
      'Enable multi-agent collaboration on single project workspaces. Continuous requirements auditing and real-time design translations completely eliminate bulky coordination logs and versioning headache traps.',
    bullets: ['Real-time multi-agent sync', 'Automatic requirement auditing', 'Zero versioning conflicts'],
  },
  {
    id: 'handoff',
    label: 'One-click Handoff',
    heading: 'Seamless one-click handoff',
    description:
      'Convert layouts to beautiful production-ready files in a single click. talanted fully supports standard React, TypeScript, elegant Tailwind styling rules, and native accessibility tags (W3C standard coverage).',
    bullets: ['React + TypeScript output', 'WCAG 2.1 AA compliant', 'Tailwind styling included'],
  },
  {
    id: 'speed',
    label: 'Speed',
    heading: 'Unmatched compilation speed',
    description:
      'talanted 2.0 brings a substantial core architecture update: 50% faster compilation speed, 65% reduced network token roundtrip latency, and 40% lightweight browser footprint. No code sluggishness.',
    bullets: ['50% faster than 1.0 model', '65% less network latency', '40% lighter browser footprint'],
  },
  {
    id: 'ai',
    label: 'AI Pipeline',
    heading: 'AI-powered multi-agent pipeline',
    description:
      'Leverage advanced context understanding directly inside all interface creation pipelines. Our custom LLM routers optimize structure files generation based on the active project mood and target rules.',
    bullets: ['Context-aware generation', 'Custom LLM routing', 'Live synthesis mode'],
  },
];

/* ── Individual mockup panels ── */

function MockupCollab() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-left select-none">
      <div className="flex justify-between items-center px-4 pt-4 pb-2 border-b border-slate-100">
        <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-mono">Workspace Session Share</span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          share link
        </span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black flex items-center justify-center">S</div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">Sophia (Scribe Agent)</p>
              <p className="text-[9px] text-slate-400 font-mono">Active workspace scribe</p>
            </div>
          </div>
          <span className="text-[9px] text-slate-500 font-bold border border-slate-200 rounded px-1.5 py-0.5">can edit</span>
        </div>
        <div className="flex items-center justify-between bg-cyan-50/60 rounded-xl px-3 py-2.5 border border-cyan-100 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black flex items-center justify-center">M</div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">Meriem Boukraa (PM)</p>
              <p className="text-[9px] text-slate-400 font-mono">Lead product owner</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] text-slate-500 font-bold border border-slate-200 rounded px-1.5 py-0.5">owner</span>
            <span className="text-[8px] text-white font-extrabold bg-violet-600 rounded px-1.5 py-0.5">PR Agent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupHandoff() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-left select-none">
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
        <div className="flex gap-3 text-[9px] font-black tracking-widest uppercase font-mono">
          <span className="text-slate-900 border-b-2 border-slate-900 pb-0.5">Code</span>
          <span className="text-slate-400">Slicing</span>
          <span className="text-slate-400">D2C</span>
          <span className="text-slate-400">Live</span>
        </div>
        <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-mono">D2C Module</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" /> React output code compilation
          </div>
          <span className="text-[10px] font-black text-cyan-600">100% Ok</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" /> Automated WCAG audit test suite
          </div>
          <span className="text-[10px] font-black text-cyan-600">Audit passed</span>
        </div>
        <button className="w-full mt-2 py-3 rounded-xl bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-default">
          <Check className="w-4 h-4 stroke-[3]" /> Generate code 100% (Success)
        </button>
      </div>
    </div>
  );
}

function MockupSpeed() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-left select-none">
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
        <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-mono">Talanted Compiler Metrics</span>
        <div className="text-right">
          <span className="text-[9px] text-slate-400 font-mono mr-2">19.4s</span>
          <span className="text-[9px] font-extrabold text-cyan-600">50% Faster file processing</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-violet-600 font-mono">6.81s</span>
          <div className="h-9 w-[55%] bg-gradient-to-r from-violet-600 to-violet-500 rounded-lg shadow-md shadow-violet-500/20" />
          <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase font-mono">2.0 Model</span>
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 font-mono">19.4s</span>
          <div className="h-9 w-full bg-slate-200 rounded-lg" />
          <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-mono">1.0 Model</span>
        </div>
      </div>
    </div>
  );
}

function MockupAI() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-left select-none">
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-700">talanted AI workspace</span>
        </div>
        <span className="text-[9px] font-black text-cyan-600 tracking-widest uppercase font-mono">Live Synth</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">Incoming AI Request</p>
          <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic">
            "I want to create a homepage layout for a modern fitness trainer web app"
          </p>
        </div>
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-3 shadow-lg shadow-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
            <span className="text-[11px] font-extrabold text-white">Generating template file blocks...</span>
          </div>
          <p className="text-[9px] text-violet-200 font-medium font-mono">12 Widgets, 6 custom layouts loaded...</p>
        </div>
      </div>
    </div>
  );
}

const MOCKUPS = [MockupCollab, MockupHandoff, MockupSpeed, MockupAI];

export default function SystemFeatures({ showToast }: SystemFeaturesProps) {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveMockup = MOCKUPS[activeTab];
  const tab = TABS[activeTab];

  return (
    <section className="py-20 lg:py-24 bg-white relative z-10 w-full" id="organizational-efficiency-talanted">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-slate-900 font-sans leading-tight">
            The all-in-one design-to-code compiler<br className="hidden sm:block" /> for organizational efficiency
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed mt-4">
            Consolidate design, eliminate communication silos, and accelerate your interface delivery by 10x.
          </p>
        </div>

        {/* Two-column feature layout */}
        <div className="flex flex-col lg:flex-row rounded-3xl overflow-hidden border border-slate-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] min-h-[440px]">

          {/* LEFT: Lavender mockup panel */}
          <div className="lg:w-[45%] bg-[#f2f3fb] flex items-center justify-center p-10 lg:p-14 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(124,58,237,0.06),transparent)] pointer-events-none" />
            <div className="relative z-10 w-full flex items-center justify-center transition-all duration-300">
              <ActiveMockup />
            </div>
          </div>

          {/* RIGHT: Tabs + content */}
          <div className="lg:w-[55%] bg-white flex flex-col justify-center px-8 sm:px-12 py-10 lg:py-14">

            {/* Tabs */}
            <div className="flex flex-wrap gap-0 border-b border-slate-200 mb-8">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                    activeTab === i
                      ? 'text-[#7c3aed] border-[#7c3aed]'
                      : 'text-slate-400 border-transparent hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="space-y-5 text-left">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                {tab.heading}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {tab.description}
              </p>
              <ul className="space-y-3 pt-2">
                {tab.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white stroke-[4]" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
