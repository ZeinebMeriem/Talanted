import React from 'react';
import { Users, Check, CheckCircle2, Sparkles } from 'lucide-react';

interface SystemFeaturesProps {
  showToast: (msg: string) => void;
}

export default function SystemFeatures({ showToast }: SystemFeaturesProps) {
  return (
    <section className="px-2 md:px-4 py-20 bg-stone-50 border-b border-stone-200" id="organizational-efficiency-talanted">
      <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-14 px-4 md:px-6">

        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 tracking-tight leading-tight">
            The all-in-one design-to-code compiler <br/>
            for organizational efficiency
          </h2>
          <p className="text-stone-500 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
            Consolidate design, eliminate communication silos, and accelerate your interface delivery by 10x.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Card 1: Better, faster collaboration */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-6">

              <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner relative">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2.5">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">Workspace session share</span>
                  <button
                    type="button"
                    onClick={() => showToast("👥 Copied project workspace share link to clipboard!")}
                    className="px-2.5 py-1 bg-white rounded-lg border border-stone-200 font-extrabold text-[9px] text-[#15395e] flex items-center gap-1 hover:bg-stone-50 transition-all cursor-pointer shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5 text-[#019cda]" />
                    share link
                  </button>
                </div>

                <div className="space-y-2 mt-4 flex-grow text-left">
                  <div className="bg-white rounded-xl border border-stone-200 p-2.5 flex items-center justify-between shadow-sm hover:border-[#019cda] transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs uppercase">
                        S
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-850">Sophia (Scribe Agent)</span>
                        <span className="text-[9px] text-stone-400 font-mono">Active workspace scribe</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-violet-50 text-violet-750 border border-violet-150 font-bold px-2 py-0.5 rounded">can edit</span>
                  </div>

                  <div className="bg-white rounded-xl border border-[#019cda]/30 p-2.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 mr-1">
                      <div className="w-8 h-8 rounded-full bg-[#019cda]/10 flex items-center justify-center text-[#019cda] font-bold text-xs uppercase font-sans">
                        M
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-850">Meriem Boukraa (PM)</span>
                        <span className="text-[9px] text-stone-400 font-mono text-left">Lead product owner</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded">owner</span>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 bg-[#019cda] text-white text-[8px] font-extrabold font-mono px-2 py-0.5 rounded shadow-lg">
                  PM Agent
                </div>

              </div>

              <div className="space-y-2 text-left">
                <h3 className="text-xl font-bold text-neutral-950">Better, faster collaboration</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Enable multi-agent collaboration on single project workspaces. Continuous requirements auditing and real-time design translations completely eliminate bulky coordination logs and versioning headache traps.
                </p>
              </div>

            </div>
          </div>

          {/* Card 2: Seamless handoff */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-6">

              <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner relative">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2 flex-row text-[9px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                  <div className="flex gap-2">
                    <span className="text-[#15395e] border-b border-[#15395e] pb-1 cursor-pointer">Code</span>
                    <span className="opacity-50 hover:opacity-90 cursor-pointer">Slicing</span>
                    <span className="opacity-50 hover:opacity-90 cursor-pointer text-violet-600 font-extrabold">D2C Live</span>
                  </div>
                  <span>D2C Module</span>
                </div>

                <div className="space-y-2 mt-4 flex-grow text-left">
                  <div className="flex items-center justify-between text-xs text-stone-800 font-medium">
                    <span className="flex items-center gap-1.5 pl-1 font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                      React output code compilation
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold font-mono">100% Ok</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-800 font-medium">
                    <span className="flex items-center gap-1.5 pl-1 font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                      Automated WCAG audit test suite
                    </span>
                    <span className="text-[10px] text-[#019cda] font-extrabold font-mono">Audit passed</span>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => showToast("⚡ Generated pure clean code bundle! Ready to push to production.")}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                    <span>Generate code 100% (Success)</span>
                  </button>
                </div>

              </div>

              <div className="space-y-2 text-left">
                <h3 className="text-xl font-bold text-neutral-950">Seamless one-click handoff</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Convert layouts to beautiful production-ready files in a single click. talanted fully supports standard React, TypeScript, elegant Tailwind styling rules, and native accessibility tags (W3C standard coverage).
                </p>
              </div>

            </div>
          </div>

          {/* Card 3: Unmatched performance */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-6">

              <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner">
                <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">talanted compiler metrics</span>
                  <span className="text-[9px] text-[#019cda] font-bold">50% Faster file processing</span>
                </div>

                {/* HTML Bar Chart representation */}
                <div className="flex items-end justify-center gap-8 h-[95px] mt-4 z-10 relative">
                  <div className="flex flex-col items-center gap-2 w-1/3">
                    <div className="text-[10px] font-bold text-violet-600 font-mono text-center">6.81s</div>
                    <div className="w-full bg-gradient-to-t from-violet-600 to-violet-500 h-[38px] rounded-lg shadow-lg relative group transition-all duration-500 hover:-translate-y-1">
                      <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse" />
                    </div>
                    <div className="text-[9px] font-bold text-stone-900 font-mono uppercase text-center">2.0 model</div>
                  </div>

                  <div className="flex flex-col items-center gap-2 w-1/3">
                    <div className="text-[10px] text-stone-400 font-bold font-mono">19.48s</div>
                    <div className="w-full bg-stone-300 h-[92px] rounded-lg transition-all duration-500 hover:-translate-y-1"></div>
                    <div className="text-[9px] font-bold text-stone-400 font-mono uppercase text-center">1.0 model</div>
                  </div>
                </div>

              </div>

              <div className="space-y-2 text-left">
                <h3 className="text-xl font-bold text-neutral-950">Unmatched compilation speed</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  talanted 2.0 brings a substantial core architecture update: 50% faster compilation speed, 65% reduced network token roundtrip latency, and 40% lightweight browser footprint. No code sluggishness.
                </p>
              </div>

            </div>
          </div>

          {/* Card 4: AI-empowered efficiency */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-6">

              <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner relative">

                <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span>talanted AI workspace</span>
                  </div>
                  <span className="text-[8px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-150 font-bold uppercase tracking-wider font-mono">live synth</span>
                </div>

                <div className="space-y-2 mt-4 flex-grow text-left">
                  <div className="bg-white rounded-xl border border-stone-200 p-2.5 text-[9px] shadow-sm text-stone-700">
                    <p className="font-extrabold uppercase text-[7px] text-stone-400 font-mono mb-1 text-left">Incoming AI request</p>
                    <p className="font-medium text-left">"I want to create a homepage layout for a modern fitness trainer web app"</p>
                  </div>

                  <div className="bg-indigo-600/95 text-white p-2.5 rounded-xl text-[9px] shadow-md flex items-center gap-2 max-w-[90%] mr-auto border border-indigo-500/50">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <div className="text-left">
                      <span className="block font-bold">Generating template file blocks...</span>
                      <span className="text-[7.5px] opacity-75 font-mono font-medium">12 Widgets, 6 custom layouts loaded...</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="space-y-2 text-left">
                <h3 className="text-xl font-bold text-neutral-950">AI-powered multi-agent pipeline</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Leverage advanced context understanding directly inside all interface creation pipelines. Our custom LLM routers optimize structure files generation based on the active project mood and target rules.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
