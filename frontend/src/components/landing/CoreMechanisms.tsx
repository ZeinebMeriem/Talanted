import React from 'react';
import { Wand2, MessageSquare, Code2, FlaskConical } from 'lucide-react';

interface CoreMechanismsProps {
  showToast: (msg: string) => void;
}

const ICON_CLS = 'w-14 h-14 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 select-none';

export default function CoreMechanisms({ showToast }: CoreMechanismsProps) {
  return (
    <section
      className="py-20 lg:py-24 bg-slate-50/50 border-t border-slate-100 relative z-10 w-full"
      id="features"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#7c3aed] uppercase font-bold tracking-wider text-[11.5px] sm:text-xs mb-3">
            Experience the future
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-slate-900 font-sans leading-tight">
            Explore more core mechanisms
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed mt-4">
            Discover how our continuous multi-agent system accelerates UX layout prototyping and code outputs.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">

          {/* CARD 1 — Generate from idea */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-8 flex flex-col text-left min-h-[300px] sm:min-h-[320px] hover:-translate-y-2 transition-transform duration-200 relative overflow-hidden group cursor-default">
            <div className="space-y-6">
              <div className={ICON_CLS} style={{ background: '#2563eb', boxShadow: '0 4px 16px #2563eb55' }}>
                <Wand2 size={24} color="#fff" strokeWidth={2} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Generate from idea</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  Powered by natural language multi-agent coordination. Just write what you need or import a meeting transcript, and watch your inspiration convert into high-fidelity code structures instantly.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 2 — Chat interface (dark) */}
          <div className="bg-[#080e26] rounded-xl border border-slate-900/10 shadow-[0_20px_50px_rgba(8,14,38,0.25)] p-8 flex flex-col text-left min-h-[300px] sm:min-h-[320px] hover:-translate-y-2 transition-transform duration-200 relative overflow-hidden group cursor-default">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c3aed]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-6 relative z-10">
              <div className={ICON_CLS} style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                <MessageSquare size={24} color="#fff" strokeWidth={2} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-extrabold text-white tracking-tight">Chat interface</h3>
                <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                  Context-aware and goal-oriented conversation. Refine designs, prompt adjustments, or implement new logic directly in code through conversational iterations with your digital engineering workforce.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3 — Code mode */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-8 flex flex-col text-left min-h-[300px] sm:min-h-[320px] hover:-translate-y-2 transition-transform duration-200 relative overflow-hidden group cursor-default">
            <div className="space-y-6">
              <div className={ICON_CLS} style={{ background: '#0d9488', boxShadow: '0 4px 16px #0d948855' }}>
                <Code2 size={24} color="#fff" strokeWidth={2} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Code mode</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  Switch designs to raw code views. Easily inspect layouts, copy css classes, extract clean tailwind design variables, debug structure, and audit syntax safety on the fly.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 4 — Code evaluation */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-8 flex flex-col text-left min-h-[300px] sm:min-h-[320px] hover:-translate-y-2 transition-transform duration-200 relative overflow-hidden group cursor-default">
            <div className="space-y-6">
              <div className={ICON_CLS} style={{ background: '#4f46e5', boxShadow: '0 4px 16px #4f46e555' }}>
                <FlaskConical size={24} color="#fff" strokeWidth={2} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Code evaluation</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  Execute or review raw compiled files instantly. Keep complete oversight of execution safety, logic flow, and runtime validation metrics with standard compiler feedbacks.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="flex justify-center mt-16">
          <button
            onClick={() => showToast('Feature preview coming soon!')}
            className="px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#7c3aed] hover:bg-[#6c26d8] active:scale-95 text-white rounded-lg transition-all cursor-pointer shadow-md shadow-purple-900/15"
          >
            Try it now
          </button>
        </div>

      </div>
    </section>
  );
}
