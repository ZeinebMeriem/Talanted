import React, { useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';

interface CoreMechanismsProps {
  showToast: (msg: string) => void;
}

export default function CoreMechanisms({ showToast }: CoreMechanismsProps) {
  const [landingPrompt, setLandingPrompt] = useState<string>("A SaaS dashboard to manage crypto transactions...");
  const [landingAgentStatus, setLandingAgentStatus] = useState<'idle' | 'scribe' | 'architect' | 'synth' | 'completed'>('idle');
  const [codeModeTab, setCodeModeTab] = useState<'preview' | 'code'>('preview');

  return (
    <section className="px-2 md:px-4 py-20 bg-stone-50/50 border-b border-stone-200/50 scroll-mt-20" id="explore-more-talanted">
      <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-10 px-4 md:px-6">

        <div className="text-center md:text-left space-y-2">
          <span className="text-[11px] font-extrabold tracking-widest text-[#019cda] uppercase">EXPERIENCE THE FUTURE</span>
          <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 tracking-tight">
            Explore more core mechanisms
          </h2>
          <p className="text-stone-500 text-xs md:text-sm max-w-xl leading-relaxed">
            Discover how our continuous multi-agent system accelerates UX layout prototyping and code outputs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Card 1: Generate from idea */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
            <div className="space-y-4">
              <div className="bg-[#fafafa] rounded-xl border border-stone-150 p-4 min-h-[160px] flex flex-col justify-between shadow-inner relative">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">Input Workspace Prompt</div>

                <div className="bg-white rounded-lg border border-stone-250 p-2.5 flex items-center justify-between shadow-sm transition-all focus-within:border-[#019cda]/80">
                  <span className="text-xs font-medium text-stone-800 line-clamp-1">
                    {landingPrompt}
                  </span>
                  <span className="w-1.5 h-4 bg-[#019cda] animate-pulse rounded-full shrink-0"></span>
                </div>

                {landingAgentStatus !== 'idle' ? (
                  <div className="bg-stone-900/95 absolute inset-4 rounded-lg p-3 text-[10px] text-emerald-400 font-mono flex flex-col justify-between space-y-1 animate-fade-in shadow-xl">
                    <div className="flex justify-between items-center border-b border-stone-800 pb-1.5">
                      <span className="font-bold text-stone-300 text-[8px] tracking-wider font-sans uppercase">agent pipeline telemetry</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <div className="space-y-1 text-left">
                      <div className={landingAgentStatus === 'scribe' ? 'text-white font-bold' : 'opacity-60'}>
                        {landingAgentStatus === 'scribe' ? '●' : '✓'} [Requirements Scribe] Analyzing idea...
                      </div>
                      <div className={landingAgentStatus === 'architect' ? 'text-white font-bold' : 'opacity-60'}>
                        {landingAgentStatus === 'architect' ? '●' : landingAgentStatus === 'scribe' ? ' ' : '✓'} [Figma Extractor] Mapping wireframes...
                      </div>
                      <div className={landingAgentStatus === 'synth' ? 'text-white font-bold' : 'opacity-60'}>
                        {landingAgentStatus === 'synth' ? '●' : (landingAgentStatus === 'scribe' || landingAgentStatus === 'architect') ? ' ' : '✓'} [Code Synth] Bundling React TSX...
                      </div>
                      <div className={landingAgentStatus === 'completed' ? 'text-emerald-300 font-bold' : 'opacity-60'}>
                        {landingAgentStatus === 'completed' ? '✓ [WCAG Auditor] Score: 100/100 AA!' : '  [WCAG Auditor] Verification queue...'}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1">
                    {["crypto", "ecom", "fintech"].map((badge, idx) => (
                      <button
                        key={idx}
                        role="button"
                        onClick={() => {
                          if (idx === 0) setLandingPrompt("A SaaS dashboard to manage crypto transactions...");
                          if (idx === 1) setLandingPrompt("A clean e-commerce shop with a responsive product grid...");
                          if (idx === 2) setLandingPrompt("A banking transactions widget with a responsive SVG pie chart...");
                          showToast(`Selected quick template: #${badge}`);
                        }}
                        className="text-[9px] bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded-md cursor-pointer font-bold transition-all lowercase"
                      >
                        #{badge}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (landingAgentStatus !== 'idle') {
                        setLandingAgentStatus('idle');
                        return;
                      }
                      setLandingAgentStatus('scribe');
                      showToast("⚙️ Multi-Agents pipeline triggered!");
                      setTimeout(() => setLandingAgentStatus('architect'), 1200);
                      setTimeout(() => setLandingAgentStatus('synth'), 2400);
                      setTimeout(() => setLandingAgentStatus('completed'), 3600);
                    }}
                    className="p-1 px-3 bg-[#15395e] hover:bg-opacity-95 text-white rounded-lg text-[10px] font-extrabold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    {landingAgentStatus === 'idle' ? 'Generate' : 'Reset'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <h3 className="text-base font-bold text-stone-900 group-hover:text-[#019cda] transition-colors">
                  Generate from idea
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Powered by natural language multi-agent coordination. Just write what you need or import a meeting transcript, and watch your inspiration convert into high-fidelity code structures instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Chat interface */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
            <div className="space-y-4">
              <div className="bg-[#fafafa] rounded-xl border border-stone-150 p-4 min-h-[160px] flex flex-col justify-between shadow-inner space-y-3">
                <div className="text-[10px] font-bold text-stone-400 text-left uppercase tracking-wider font-mono">Multi-agent chat</div>

                <div className="space-y-2 flex-grow overflow-y-auto">
                  <div className="bg-stone-200/50 p-2.5 rounded-xl text-[10px] text-stone-850 text-right leading-normal max-w-[85%] ml-auto shadow-sm border border-stone-200/30">
                    <p className="font-medium">"Please add colored status badges to the dashboard"</p>
                  </div>
                  <div className="bg-violet-50 border border-violet-100 p-2.5 rounded-xl text-[10px] text-violet-950 text-left leading-normal max-w-[85%] mr-auto shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                      <span className="font-extrabold text-[9px] text-violet-700 uppercase font-sans">Code Synth Agent</span>
                    </div>
                    <p className="font-medium">I have injected dynamic status badge labels (Success, Pending, Failed) styled with Tailwind.</p>
                  </div>
                </div>

                <div className="p-1 px-2.5 bg-white rounded-lg border border-stone-200 text-[10px] flex items-center justify-between shadow-sm">
                  <span className="text-stone-400 font-medium">Reply to talanted...</span>
                  <div className="w-5 h-5 bg-stone-100 border border-stone-250 rounded-full flex items-center justify-center cursor-pointer text-stone-500 hover:bg-stone-200">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <h3 className="text-base font-bold text-stone-900 group-hover:text-[#019cda] transition-colors">
                  Chat interface
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Context-aware and goal-oriented conversation. Refine designs, prompt adjustments, or implement new logic directly in code through conversational iterations with your digital engineering workforce.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Code mode */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
            <div className="space-y-4">
              <div className="bg-[#fafafa] rounded-xl border border-stone-150 p-3 min-h-[160px] flex flex-col justify-between shadow-inner">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>

                  <div className="bg-stone-200/65 rounded-lg p-0.5 flex gap-0.5 border border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeModeTab('preview');
                        showToast("🎨 Switched widget to Preview view");
                      }}
                      className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                        codeModeTab === 'preview' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeModeTab('code');
                        showToast("💻 Switched widget to Code view");
                      }}
                      className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                        codeModeTab === 'code' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      Code
                    </button>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-lg border border-stone-150 flex-grow mt-2 flex flex-col justify-center text-xs font-mono min-h-[90px] shadow-sm">
                  {codeModeTab === 'preview' ? (
                    <div className="space-y-1.5 text-center p-2">
                      <div className="text-[11px] font-bold text-stone-900">Preview Layout Widget</div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-100 flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                        <span className="px-2.5 py-1 rounded bg-[#15395e]/5 text-[#15395e] text-[10px] font-extrabold border border-[#15395e]/10 shadow-sm">
                          WCAG 100/100
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-stone-700 text-left leading-normal font-mono p-1">
                      <span className="text-indigo-600">const</span> Dashboard = () =&gt; &#123;<br/>
                      &nbsp;&nbsp;<span className="text-indigo-600">return</span> (<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-rose-600">div</span> <span className="text-amber-600">className</span>=<span className="text-emerald-700">"p-6 bg-white"</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-rose-600">h2</span>&gt;Transactions&lt;/<span className="text-rose-600">h2</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-rose-600">div</span>&gt;<br/>
                      &nbsp;&nbsp;);<br/>
                      &#125;;
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <h3 className="text-base font-bold text-stone-900 group-hover:text-[#019cda] transition-colors">
                  Code mode
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Switch designs to raw code views. Easily inspect layouts, copy css classes, extract clean tailwind design variables, debug structure, and audit syntax safety on the fly.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
